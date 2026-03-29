import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from './ThemeProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

import { getUserId } from '../lib/authUtils';

export default function ModalChequeFactoria({ isOpen, onClose, factorias, onChequeRegistrado, user, chequeAEditar }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    numero_cheque: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    factoria: '',
    notas: ''
  });

  useEffect(() => {
    if (chequeAEditar) {
      setFormData({
        numero_cheque: chequeAEditar.numero_cheque || '',
        monto: chequeAEditar.monto || '',
        fecha: chequeAEditar.fecha ? chequeAEditar.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
        factoria: chequeAEditar.factoria || '',
        notas: chequeAEditar.notas || ''
      });
    } else {
      setFormData({
        numero_cheque: '',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        factoria: '',
        notas: ''
      });
    }
  }, [chequeAEditar, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.numero_cheque || !formData.monto || !formData.fecha || !formData.factoria) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      const userId = await getUserId(user);
      if (!userId) {
        throw new Error("No se pudo obtener un ID de usuario válido para registrar el cheque.");
      }

      const payload = {
        ...formData,
        monto: parseFloat(formData.monto),
        user_id: userId
      };

      if (chequeAEditar) {
        const { error } = await supabase
          .from('cheques_factoria')
          .update(payload)
          .eq('id', chequeAEditar.id);

        if (error) throw error;
        alert('Cheque actualizado exitosamente');
      } else {
        const { error } = await supabase
          .from('cheques_factoria')
          .insert([payload]);

        if (error) throw error;
        alert('Cheque registrado exitosamente');
      }

      onChequeRegistrado();
      onClose();
      // Reset form
      setFormData({
        numero_cheque: '',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        factoria: '',
        notas: ''
      });
    } catch (error) {
      console.error('Error al registrar cheque:', error);
      alert('Error al registrar el cheque: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {chequeAEditar ? 'Editar Cheque de Factoría' : 'Registrar Cheque de Factoría'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="numero_cheque">Número de Cheque <span className="text-red-500">*</span></Label>
            <Input
              id="numero_cheque"
              name="numero_cheque"
              value={formData.numero_cheque}
              onChange={handleChange}
              placeholder="Ej. CHQ-12345"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="monto">Monto <span className="text-red-500">*</span></Label>
            <Input
              id="monto"
              name="monto"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.monto}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha <span className="text-red-500">*</span></Label>
            <Input
              id="fecha"
              name="fecha"
              type="date"
              value={formData.fecha}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="factoria">Factoría <span className="text-red-500">*</span></Label>
            <Input
              id="factoria"
              name="factoria"
              list="factorias-list"
              value={formData.factoria}
              onChange={handleChange}
              placeholder="Nombre de la factoría"
              required
            />
            <datalist id="factorias-list">
              {factorias.map(factoria => (
                <option key={factoria} value={factoria} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas (Opcional)</Label>
            <Textarea
              id="notas"
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              placeholder="Detalles adicionales..."
              className="resize-none h-20"
            />
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
              {loading ? 'Guardando...' : chequeAEditar ? 'Guardar Cambios' : 'Guardar Cheque'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
