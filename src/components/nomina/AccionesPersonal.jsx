import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function AccionesPersonal() {
  const [acciones, setAcciones] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const initialForm = {
    empleado_id: '',
    tipo_accion: 'Aumento',
    fecha_accion: new Date().toISOString().split('T')[0],
    detalle: '',
    aprobado_por: ''
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [accRes, empRes] = await Promise.all([
      supabase.from('nom_acciones_personal').select(`*, nom_empleados(nombre, apellido)`).order('fecha_accion', { ascending: false }),
      supabase.from('nom_empleados').select('id, nombre, apellido')
    ]);

    if (accRes.data) setAcciones(accRes.data);
    if (empRes.data) setEmpleados(empRes.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await supabase.from('nom_acciones_personal').update(formData).eq('id', editingId);
        toast.success('Acción actualizada');
      } else {
        await supabase.from('nom_acciones_personal').insert([formData]);
        toast.success('Acción registrada');
      }
      setShowModal(false);
      setFormData(initialForm);
      setEditingId(null);
      fetchData();
    } catch (error) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar acción?')) {
      await supabase.from('nom_acciones_personal').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Acciones de Personal</h2>
        <Button onClick={() => { setFormData(initialForm); setEditingId(null); setShowModal(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nueva Acción
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Detalle</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {acciones.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center">No hay registros</TableCell></TableRow>
            ) : (
              acciones.map((acc) => (
                <TableRow key={acc.id}>
                  <TableCell>{acc.nom_empleados?.nombre} {acc.nom_empleados?.apellido}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      acc.tipo_accion === 'Despido' ? 'bg-red-100 text-red-800' :
                      acc.tipo_accion === 'Aumento' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {acc.tipo_accion}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(acc.fecha_accion).toLocaleDateString()}</TableCell>
                  <TableCell className="max-w-xs truncate" title={acc.detalle}>{acc.detalle}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setFormData(acc); setEditingId(acc.id); setShowModal(true); }}><Edit className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(acc.id)}><Trash2 className="h-4 w-4"/></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Editar' : 'Registrar'} Acción</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <Select value={formData.empleado_id} onValueChange={v => setFormData({...formData, empleado_id: v})}>
              <SelectTrigger><SelectValue placeholder="Seleccionar Empleado" /></SelectTrigger>
              <SelectContent>
                {empleados.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre} {e.apellido}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={formData.tipo_accion} onValueChange={v => setFormData({...formData, tipo_accion: v})}>
              <SelectTrigger><SelectValue placeholder="Tipo de Acción" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Aumento">Aumento Salarial</SelectItem>
                <SelectItem value="Traslado">Traslado</SelectItem>
                <SelectItem value="Vacaciones">Vacaciones</SelectItem>
                <SelectItem value="Amonestacion">Amonestación</SelectItem>
                <SelectItem value="Renuncia">Renuncia</SelectItem>
                <SelectItem value="Despido">Despido</SelectItem>
              </SelectContent>
            </Select>

            <Input type="date" value={formData.fecha_accion} onChange={e => setFormData({...formData, fecha_accion: e.target.value})} required />
            <Input placeholder="Detalle / Observaciones" value={formData.detalle} onChange={e => setFormData({...formData, detalle: e.target.value})} />
            <Input placeholder="Aprobado por" value={formData.aprobado_por} onChange={e => setFormData({...formData, aprobado_por: e.target.value})} />

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
