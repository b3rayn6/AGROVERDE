import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Edit, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function Departamentos() {
  const [departamentos, setDepartamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });

  useEffect(() => {
    fetchDepartamentos();
  }, []);

  const fetchDepartamentos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('nom_departamentos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setDepartamentos(data || []);
    } catch (error) {
      toast.error('Error al cargar departamentos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const { error } = await supabase.from('nom_departamentos').update(formData).eq('id', editingId);
        if (error) throw error;
        toast.success('Departamento actualizado');
      } else {
        const { error } = await supabase.from('nom_departamentos').insert([formData]);
        if (error) throw error;
        toast.success('Departamento creado');
      }
      setShowModal(false);
      setFormData({ nombre: '', descripcion: '' });
      setEditingId(null);
      fetchDepartamentos();
    } catch (error) {
      toast.error('Error al guardar: ' + error.message);
    }
  };

  const handleEdit = (dept) => {
    setFormData({ nombre: dept.nombre, descripcion: dept.descripcion });
    setEditingId(dept.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de eliminar este departamento?')) return;
    try {
      const { error } = await supabase.from('nom_departamentos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Departamento eliminado');
      fetchDepartamentos();
    } catch (error) {
      toast.error('Error al eliminar: ' + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Listado de Departamentos</h2>
        <Button onClick={() => { setFormData({ nombre: '', descripcion: '' }); setEditingId(null); setShowModal(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Departamento
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departamentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">No hay departamentos registrados</TableCell>
              </TableRow>
            ) : (
              departamentos.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.nombre}</TableCell>
                  <TableCell>{dept.descripcion}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(dept)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(dept.id)}>
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
            <DialogTitle>{editingId ? 'Editar Departamento' : 'Nuevo Departamento'}</DialogTitle>
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
