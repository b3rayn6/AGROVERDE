import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, Plus, User, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function Empleados() {
  const [empleados, setEmpleados] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  const initialForm = {
    nombre: '', apellido: '', cedula: '', email: '', telefono: '',
    departamento_id: '', puesto_id: '', salario_base: '', fecha_ingreso: '',
    estado: 'Activo', direccion: ''
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [empRes, depRes, puesRes] = await Promise.all([
      supabase.from('nom_empleados').select(`*, nom_departamentos(nombre), nom_puestos(nombre)`).order('nombre'),
      supabase.from('nom_departamentos').select('id, nombre'),
      supabase.from('nom_puestos').select('id, nombre')
    ]);

    if (empRes.data) setEmpleados(empRes.data);
    if (depRes.data) setDepartamentos(depRes.data);
    if (puesRes.data) setPuestos(puesRes.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await supabase.from('nom_empleados').update(formData).eq('id', editingId);
        toast.success('Empleado actualizado');
      } else {
        await supabase.from('nom_empleados').insert([formData]);
        toast.success('Empleado registrado');
      }
      setShowModal(false);
      setFormData(initialForm);
      setEditingId(null);
      fetchData();
    } catch (error) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleEdit = (emp) => {
    setFormData(emp);
    setEditingId(emp.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar empleado? Esta acción no se puede deshacer.')) {
      await supabase.from('nom_empleados').delete().eq('id', id);
      fetchData();
    }
  };

  const filteredEmpleados = empleados.filter(e => 
    e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.cedula?.includes(searchTerm)
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar empleado..." 
            className="pl-8" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => { setFormData(initialForm); setEditingId(null); setShowModal(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Empleado
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead>Salario</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmpleados.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell>
                  <div className="font-medium">{emp.nombre} {emp.apellido}</div>
                  <div className="text-xs text-gray-500">{emp.cedula}</div>
                </TableCell>
                <TableCell>{emp.nom_departamentos?.nombre || '-'}</TableCell>
                <TableCell>{emp.nom_puestos?.nombre || '-'}</TableCell>
                <TableCell>${emp.salario_base}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    emp.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {emp.estado}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(emp)}><Edit className="h-4 w-4"/></Button>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(emp.id)}><Trash2 className="h-4 w-4"/></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editingId ? 'Editar' : 'Nuevo'} Empleado</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-4">
            <Input placeholder="Nombre" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
            <Input placeholder="Apellido" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} required />
            
            <Input placeholder="Cédula" value={formData.cedula} onChange={e => setFormData({...formData, cedula: e.target.value})} />
            <Input placeholder="Fecha Nacimiento" type="date" value={formData.fecha_nacimiento || ''} onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})} />
            
            <Input placeholder="Teléfono" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
            <Input placeholder="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            
            <Select value={formData.departamento_id} onValueChange={v => setFormData({...formData, departamento_id: v})}>
              <SelectTrigger><SelectValue placeholder="Departamento" /></SelectTrigger>
              <SelectContent>
                {departamentos.map(d => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={formData.puesto_id} onValueChange={v => setFormData({...formData, puesto_id: v})}>
              <SelectTrigger><SelectValue placeholder="Puesto" /></SelectTrigger>
              <SelectContent>
                {puestos.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>

            <Input placeholder="Salario Base" type="number" value={formData.salario_base} onChange={e => setFormData({...formData, salario_base: e.target.value})} required />
            <Input placeholder="Fecha Ingreso" type="date" value={formData.fecha_ingreso} onChange={e => setFormData({...formData, fecha_ingreso: e.target.value})} required />

            <Select value={formData.estado} onValueChange={v => setFormData({...formData, estado: v})}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
                <SelectItem value="Licencia">Licencia</SelectItem>
              </SelectContent>
            </Select>

            <Input placeholder="Dirección" className="col-span-2" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />

            <div className="col-span-2 flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit">Guardar Empleado</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
