import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function Puestos() {
  const [puestos, setPuestos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    nombre: '', 
    descripcion: '', 
    departamento_id: '',
    salario_min: '',
    salario_max: ''
  });

  useEffect(() => {
    fetchPuestos();
    fetchDepartamentos();
  }, []);

  const fetchPuestos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('nom_puestos')
        .select(`
          *,
          nom_departamentos (nombre)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPuestos(data || []);
    } catch (error) {
      toast.error('Error al cargar puestos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartamentos = async () => {
    try {
      const { data } = await supabase.from('nom_departamentos').select('id, nombre');
      setDepartamentos(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const { error } = await supabase.from('nom_puestos').update(formData).eq('id', editingId);
        if (error) throw error;
        toast.success('Puesto actualizado');
      } else {
        const { error } = await supabase.from('nom_puestos').insert([formData]);
        if (error) throw error;
        toast.success('Puesto creado');
      }
      setShowModal(false);
      setFormData({ nombre: '', descripcion: '', departamento_id: '', salario_min: '', salario_max: '' });
      setEditingId(null);
      fetchPuestos();
    } catch (error) {
      toast.error('Error al guardar: ' + error.message);
    }
  };

  const handleEdit = (puesto) => {
    setFormData({ 
      nombre: puesto.nombre, 
      descripcion: puesto.descripcion, 
      departamento_id: puesto.departamento_id,
      salario_min: puesto.salario_min,
      salario_max: puesto.salario_max
    });
    setEditingId(puesto.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de eliminar este puesto?')) return;
    try {
      const { error } = await supabase.from('nom_puestos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Puesto eliminado');
      fetchPuestos();
    } catch (error) {
      toast.error('Error al eliminar: ' + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Listado de Puestos</h2>
        <Button onClick={() => { setFormData({ nombre: '', descripcion: '', departamento_id: '', salario_min: '', salario_max: '' }); setEditingId(null); setShowModal(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Puesto
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Rango Salarial</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {puestos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">No hay puestos registrados</TableCell>
              </TableRow>
            ) : (
              puestos.map((puesto) => (
                <TableRow key={puesto.id}>
                  <TableCell className="font-medium">{puesto.nombre}</TableCell>
                  <TableCell>{puesto.nom_departamentos?.nombre || 'N/A'}</TableCell>
                  <TableCell>{puesto.salario_min} - {puesto.salario_max}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(puesto)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(puesto.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Puesto' : 'Nuevo Puesto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Departamento</label>
              <Select 
                value={formData.departamento_id} 
                onValueChange={(value) => setFormData({...formData, departamento_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departamentos.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Salario Mínimo</label>
                <Input
                  type="number"
                  value={formData.salario_min}
                  onChange={(e) => setFormData({ ...formData, salario_min: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Salario Máximo</label>
                <Input
                  type="number"
                  value={formData.salario_max}
                  onChange={(e) => setFormData({ ...formData, salario_max: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Input
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
