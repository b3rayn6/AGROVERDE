import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, Plus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function Candidatos() {
  const [candidatos, setCandidatos] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', cedula: '', telefono: '', email: '',
    puesto_aplicado_id: '', estado: 'Pendiente', notas: ''
  });

  useEffect(() => {
    fetchCandidatos();
    fetchPuestos();
  }, []);

  const fetchCandidatos = async () => {
    const { data, error } = await supabase.from('nom_candidatos')
      .select('*, nom_puestos(nombre)').order('created_at', { ascending: false });
    if (data) setCandidatos(data);
  };

  const fetchPuestos = async () => {
    const { data } = await supabase.from('nom_puestos').select('id, nombre');
    setPuestos(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (editingId) {
      await supabase.from('nom_candidatos').update(payload).eq('id', editingId);
      toast.success('Candidato actualizado');
    } else {
      await supabase.from('nom_candidatos').insert([payload]);
      toast.success('Candidato registrado');
    }
    setShowModal(false);
    resetForm();
    fetchCandidatos();
  };

  const resetForm = () => {
    setFormData({ nombre: '', apellido: '', cedula: '', telefono: '', email: '', puesto_aplicado_id: '', estado: 'Pendiente', notas: '' });
    setEditingId(null);
  };

  const handleEdit = (c) => {
    setFormData(c);
    setEditingId(c.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar candidato?')) {
      await supabase.from('nom_candidatos').delete().eq('id', id);
      fetchCandidatos();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-semibold">Registro de Candidatos</h2>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Candidato
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre Completo</TableHead>
              <TableHead>Puesto Aplicado</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidatos.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.nombre} {c.apellido}</TableCell>
                <TableCell>{c.nom_puestos?.nombre || 'N/A'}</TableCell>
                <TableCell>{c.telefono} <br/><span className="text-xs text-gray-500">{c.email}</span></TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    c.estado === 'Contratado' ? 'bg-green-100 text-green-800' : 
                    c.estado === 'Rechazado' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {c.estado}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Edit className="h-4 w-4"/></Button>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4"/></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Editar' : 'Nuevo'} Candidato</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="Nombre" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
              <Input placeholder="Apellido" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="Cédula" value={formData.cedula} onChange={e => setFormData({...formData, cedula: e.target.value})} />
              <Input placeholder="Teléfono" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
            </div>
            <Input placeholder="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            
            <Select value={formData.puesto_aplicado_id} onValueChange={v => setFormData({...formData, puesto_aplicado_id: v})}>
              <SelectTrigger><SelectValue placeholder="Puesto Aplicado" /></SelectTrigger>
              <SelectContent>
                {puestos.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={formData.estado} onValueChange={v => setFormData({...formData, estado: v})}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="Entrevistado">Entrevistado</SelectItem>
                <SelectItem value="Contratado">Contratado</SelectItem>
                <SelectItem value="Rechazado">Rechazado</SelectItem>
              </SelectContent>
            </Select>

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
