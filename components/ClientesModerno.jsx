// EJEMPLO DE MÓDULO MIGRADO AL NUEVO SISTEMA DE DISEÑO
// Módulo de Clientes con diseño moderno y totalmente responsivo

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TableLoading,
  Alert,
  Badge,
  StatsGrid,
  Stats
} from './ui';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Users, 
  Phone, 
  Mail, 
  MapPin,
  DollarSign,
  TrendingUp,
  Filter,
  Download,
  X
} from 'lucide-react';
import { formatCurrency } from '../lib/formatters';

export default function ClientesModerno({ user }) {
  const [clientes, setClientes] = useState([]);
  const [filteredClientes, setFilteredClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    cedula: '',
    rnc: '',
    limite_credito: 0,
    notas: ''
  });

  useEffect(() => {
    loadClientes();
  }, []);

  useEffect(() => {
    const filtered = clientes.filter(cliente =>
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.telefono?.includes(searchTerm) ||
      cliente.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClientes(filtered);
  }, [searchTerm, clientes]);

  const loadClientes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setClientes(data || []);
      setFilteredClientes(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (editingCliente) {
        const { error } = await supabase
          .from('clientes')
          .update(formData)
          .eq('id', editingCliente.id);

        if (error) throw error;
        setSuccess('Cliente actualizado correctamente');
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([formData]);

        if (error) throw error;
        setSuccess('Cliente creado correctamente');
      }

      setShowModal(false);
      resetForm();
      loadClientes();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nombre: cliente.nombre,
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      cedula: cliente.cedula || '',
      rnc: cliente.rnc || '',
      limite_credito: cliente.limite_credito || 0,
      notas: cliente.notas || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccess('Cliente eliminado correctamente');
      loadClientes();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      telefono: '',
      email: '',
      direccion: '',
      cedula: '',
      rnc: '',
      limite_credito: 0,
      notas: ''
    });
    setEditingCliente(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Calcular estadísticas
  const totalClientes = clientes.length;
  const clientesActivos = clientes.filter(c => c.activo !== false).length;
  const totalLimiteCredito = clientes.reduce((sum, c) => sum + (parseFloat(c.limite_credito) || 0), 0);

  return (
    <Container size="default" padding="lg">
      {/* Alertas */}
      {error && (
        <Alert variant="danger" title="Error" onClose={() => setError(null)} className="mb-6">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" title="¡Éxito!" onClose={() => setSuccess(null)} className="mb-6">
          {success}
        </Alert>
      )}

      {/* Estadísticas */}
      <StatsGrid className="mb-6">
        <Stats
          title="Total Clientes"
          value={totalClientes}
          icon={Users}
          variant="primary"
        />
        <Stats
          title="Clientes Activos"
          value={clientesActivos}
          icon={TrendingUp}
          variant="success"
        />
        <Stats
          title="Límite de Crédito Total"
          value={formatCurrency(totalLimiteCredito)}
          icon={DollarSign}
          variant="info"
        />
        <Stats
          title="Promedio por Cliente"
          value={formatCurrency(totalClientes > 0 ? totalLimiteCredito / totalClientes : 0)}
          icon={DollarSign}
          variant="warning"
        />
      </StatsGrid>

      {/* Barra de acciones */}
      <Card variant="elevated" className="mb-6">
        <CardContent padding="default">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Buscar por nombre, teléfono o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={Search}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="secondary" 
                icon={Filter}
                onClick={() => setShowFilters(!showFilters)}
              >
                <span className="hidden sm:inline">Filtros</span>
              </Button>
              <Button variant="success" icon={Download}>
                <span className="hidden sm:inline">Exportar</span>
              </Button>
              <Button variant="primary" icon={Plus} onClick={handleOpenModal}>
                <span className="hidden sm:inline">Nuevo Cliente</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de clientes */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent padding="none">
          {loading ? (
            <div className="p-6">
              <TableLoading colSpan={7} rows={5} />
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="p-6">
              <TableEmpty message="No se encontraron clientes" colSpan={7} />
            </div>
          ) : (
            <Table responsive>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead className="hidden xl:table-cell">Cédula/RNC</TableHead>
                  <TableHead className="hidden sm:table-cell">Límite Crédito</TableHead>
                  <TableHead className="hidden md:table-cell">Estado</TableHead>
                  <TableHead align="right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-gray-900">{cliente.nombre}</p>
                        <p className="text-xs text-gray-500 sm:hidden">
                          {cliente.telefono}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        {cliente.telefono || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        {cliente.email || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {cliente.cedula || cliente.rnc || 'N/A'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="font-semibold text-primary-600">
                        {formatCurrency(cliente.limite_credito || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge 
                        variant={cliente.activo !== false ? 'success' : 'danger'}
                        dot
                      >
                        {cliente.activo !== false ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Edit2}
                          onClick={() => handleEdit(cliente)}
                        >
                          <span className="hidden lg:inline">Editar</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          onClick={() => handleDelete(cliente.id)}
                        >
                          <span className="hidden lg:inline">Eliminar</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de crear/editar */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
        size="lg"
        footer={
          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={loading}
              onClick={handleSubmit}
            >
              {editingCliente ? 'Actualizar' : 'Crear'}
            </Button>
          </ModalFooter>
        }
      >
        <ModalBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nombre"
                placeholder="Nombre del cliente"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                icon={Users}
                required
                fullWidth
              />
              <Input
                label="Teléfono"
                type="tel"
                placeholder="(809) 000-0000"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                icon={Phone}
                fullWidth
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                placeholder="cliente@ejemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                icon={Mail}
                fullWidth
              />
              <Input
                label="Límite de Crédito"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.limite_credito}
                onChange={(e) => setFormData({ ...formData, limite_credito: e.target.value })}
                icon={DollarSign}
                fullWidth
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Cédula"
                placeholder="000-0000000-0"
                value={formData.cedula}
                onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                fullWidth
              />
              <Input
                label="RNC"
                placeholder="000-00000-0"
                value={formData.rnc}
                onChange={(e) => setFormData({ ...formData, rnc: e.target.value })}
                fullWidth
              />
            </div>

            <Input
              label="Dirección"
              placeholder="Dirección completa"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              icon={MapPin}
              fullWidth
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notas
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Notas adicionales..."
                rows={3}
                className="block w-full px-4 py-3 text-sm text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 outline-none bg-gray-50 hover:bg-white resize-none"
              />
            </div>
          </form>
        </ModalBody>
      </Modal>
    </Container>
  );
}
