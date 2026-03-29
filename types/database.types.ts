export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activos_fijos: {
        Row: {
          categoria: string
          codigo: string
          costo_adquisicion: number
          depreciacion_acumulada: number | null
          descripcion: string | null
          estado: string
          fecha_actualizacion: string | null
          fecha_adquisicion: string
          fecha_registro: string | null
          id: number
          metodo_depreciacion: string
          moneda: string
          nombre: string
          notas: string | null
          numero_factura: string | null
          numero_serie: string | null
          proveedor: string | null
          ubicacion: string | null
          usuario_registro: string | null
          valor_en_libros: number | null
          valor_residual: number | null
          vida_util_anos: number
        }
        Insert: {
          categoria: string
          codigo: string
          costo_adquisicion: number
          depreciacion_acumulada?: number | null
          descripcion?: string | null
          estado?: string
          fecha_actualizacion?: string | null
          fecha_adquisicion: string
          fecha_registro?: string | null
          id?: number
          metodo_depreciacion?: string
          moneda?: string
          nombre: string
          notas?: string | null
          numero_factura?: string | null
          numero_serie?: string | null
          proveedor?: string | null
          ubicacion?: string | null
          usuario_registro?: string | null
          valor_en_libros?: number | null
          valor_residual?: number | null
          vida_util_anos: number
        }
        Update: {
          categoria?: string
          codigo?: string
          costo_adquisicion?: number
          depreciacion_acumulada?: number | null
          descripcion?: string | null
          estado?: string
          fecha_actualizacion?: string | null
          fecha_adquisicion?: string
          fecha_registro?: string | null
          id?: number
          metodo_depreciacion?: string
          moneda?: string
          nombre?: string
          notas?: string | null
          numero_factura?: string | null
          numero_serie?: string | null
          proveedor?: string | null
          ubicacion?: string | null
          usuario_registro?: string | null
          valor_en_libros?: number | null
          valor_residual?: number | null
          vida_util_anos?: number
        }
        Relationships: []
      }
      catalogo_cuentas: {
        Row: {
          activa: boolean | null
          codigo: string
          created_at: string | null
          cuenta_padre_id: number | null
          id: number
          nivel: number | null
          nombre: string
          saldo_actual: number | null
          saldo_inicial: number | null
          subtipo: string | null
          tipo: string
        }
        Insert: {
          activa?: boolean | null
          codigo: string
          created_at?: string | null
          cuenta_padre_id?: number | null
          id?: number
          nivel?: number | null
          nombre: string
          saldo_actual?: number | null
          saldo_inicial?: number | null
          subtipo?: string | null
          tipo: string
        }
        Update: {
          activa?: boolean | null
          codigo?: string
          created_at?: string | null
          cuenta_padre_id?: number | null
          id?: number
          nivel?: number | null
          nombre?: string
          saldo_actual?: number | null
          saldo_inicial?: number | null
          subtipo?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_cuentas_cuenta_padre_id_fkey"
            columns: ["cuenta_padre_id"]
            isOneToOne: false
            referencedRelation: "catalogo_cuentas"
            referencedColumns: ["id"]
          },
        ]
      }
      cheques_factoria: {
        Row: {
          created_at: string | null
          factoria: string
          fecha: string
          id: string
          monto: number
          notas: string | null
          numero_cheque: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          factoria: string
          fecha: string
          id?: string
          monto: number
          notas?: string | null
          numero_cheque: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          factoria?: string
          fecha?: string
          id?: string
          monto?: number
          notas?: string | null
          numero_cheque?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cheques_factoria_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      choferes: {
        Row: {
          created_at: string | null
          id: string
          nombre: string
          placa: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre: string
          placa?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre?: string
          placa?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choferes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          balance_pendiente: number | null
          cedula: string | null
          cedula_rnc: string | null
          created_at: string | null
          direccion: string | null
          email: string | null
          favorite_color: string | null
          id: number
          limite_credito: number | null
          nombre: string
          telefono: string | null
        }
        Insert: {
          balance_pendiente?: number | null
          cedula?: string | null
          cedula_rnc?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          favorite_color?: string | null
          id?: number
          limite_credito?: number | null
          nombre: string
          telefono?: string | null
        }
        Update: {
          balance_pendiente?: number | null
          cedula?: string | null
          cedula_rnc?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          favorite_color?: string | null
          id?: number
          limite_credito?: number | null
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
      cobros_clientes: {
        Row: {
          cliente_id: number | null
          created_at: string | null
          factura_venta_id: number | null
          fecha: string
          id: number
          metodo_pago: string | null
          monto: number
          notas: string | null
          referencia: string | null
        }
        Insert: {
          cliente_id?: number | null
          created_at?: string | null
          factura_venta_id?: number | null
          fecha: string
          id?: number
          metodo_pago?: string | null
          monto: number
          notas?: string | null
          referencia?: string | null
        }
        Update: {
          cliente_id?: number | null
          created_at?: string | null
          factura_venta_id?: number | null
          fecha?: string
          id?: number
          metodo_pago?: string | null
          monto?: number
          notas?: string | null
          referencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cobros_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobros_clientes_factura_venta_id_fkey"
            columns: ["factura_venta_id"]
            isOneToOne: false
            referencedRelation: "facturas_venta"
            referencedColumns: ["id"]
          },
        ]
      }
      cobros_ventas: {
        Row: {
          created_at: string | null
          fecha_cobro: string
          id: number
          metodo_pago: string
          monto: number
          notas: string | null
          venta_id: number | null
        }
        Insert: {
          created_at?: string | null
          fecha_cobro: string
          id?: number
          metodo_pago: string
          monto: number
          notas?: string | null
          venta_id?: number | null
        }
        Update: {
          created_at?: string | null
          fecha_cobro?: string
          id?: number
          metodo_pago?: string
          monto?: number
          notas?: string | null
          venta_id?: number | null
        }
        Relationships: []
      }
      compensaciones: {
        Row: {
          cliente_id: number | null
          created_at: string | null
          deuda_anterior: number
          deuda_nueva: number
          fecha: string
          id: number
          monto_compensado: number
          notas: string | null
          pesada_id: string | null
          saldo_favor: number | null
        }
        Insert: {
          cliente_id?: number | null
          created_at?: string | null
          deuda_anterior: number
          deuda_nueva: number
          fecha?: string
          id?: number
          monto_compensado: number
          notas?: string | null
          pesada_id?: string | null
          saldo_favor?: number | null
        }
        Update: {
          cliente_id?: number | null
          created_at?: string | null
          deuda_anterior?: number
          deuda_nueva?: number
          fecha?: string
          id?: number
          monto_compensado?: number
          notas?: string | null
          pesada_id?: string | null
          saldo_favor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compensaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensaciones_pesada_id_fkey"
            columns: ["pesada_id"]
            isOneToOne: false
            referencedRelation: "pesadas"
            referencedColumns: ["id"]
          },
        ]
      }
      compensaciones_cuentas: {
        Row: {
          created_at: string | null
          cuenta_cobrar_id: number | null
          cuenta_pagar_id: number | null
          fecha: string
          id: string
          monto_compensado: number
          nota_credito_id: string | null
          notas: string | null
          pesada_id: string | null
          saldo_favor: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          cuenta_cobrar_id?: number | null
          cuenta_pagar_id?: number | null
          fecha?: string
          id?: string
          monto_compensado: number
          nota_credito_id?: string | null
          notas?: string | null
          pesada_id?: string | null
          saldo_favor?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          cuenta_cobrar_id?: number | null
          cuenta_pagar_id?: number | null
          fecha?: string
          id?: string
          monto_compensado?: number
          nota_credito_id?: string | null
          notas?: string | null
          pesada_id?: string | null
          saldo_favor?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compensaciones_cuentas_cuenta_cobrar_id_fkey"
            columns: ["cuenta_cobrar_id"]
            isOneToOne: false
            referencedRelation: "cuentas_por_cobrar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensaciones_cuentas_cuenta_pagar_id_fkey"
            columns: ["cuenta_pagar_id"]
            isOneToOne: false
            referencedRelation: "facturas_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensaciones_cuentas_nota_credito_id_fkey"
            columns: ["nota_credito_id"]
            isOneToOne: false
            referencedRelation: "notas_credito"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensaciones_cuentas_pesada_id_fkey"
            columns: ["pesada_id"]
            isOneToOne: false
            referencedRelation: "pesadas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_divisa: {
        Row: {
          actualizado_por: string | null
          fecha_actualizacion: string | null
          id: number
          tasa_dolar: number | null
        }
        Insert: {
          actualizado_por?: string | null
          fecha_actualizacion?: string | null
          id?: number
          tasa_dolar?: number | null
        }
        Update: {
          actualizado_por?: string | null
          fecha_actualizacion?: string | null
          id?: number
          tasa_dolar?: number | null
        }
        Relationships: []
      }
      contador_global: {
        Row: {
          id: number
          ultima_actualizacion: string | null
          visitas: number
        }
        Insert: {
          id?: number
          ultima_actualizacion?: string | null
          visitas?: number
        }
        Update: {
          id?: number
          ultima_actualizacion?: string | null
          visitas?: number
        }
        Relationships: []
      }
      counter: {
        Row: {
          id: number
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          id?: number
          updated_at?: string | null
          user_id: string
          value?: number
        }
        Update: {
          id?: number
          updated_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      counter_history: {
        Row: {
          change_amount: number
          counter_id: number
          created_at: string
          id: string
          new_value: number
          previous_value: number
          user_id: string | null
        }
        Insert: {
          change_amount: number
          counter_id: number
          created_at?: string
          id?: string
          new_value: number
          previous_value: number
          user_id?: string | null
        }
        Update: {
          change_amount?: number
          counter_id?: number
          created_at?: string
          id?: string
          new_value?: number
          previous_value?: number
          user_id?: string | null
        }
        Relationships: []
      }
      cuadre_caja: {
        Row: {
          categoria: string | null
          cliente_id: number | null
          concepto: string
          created_at: string | null
          cuenta_cobrar_id: number | null
          descripcion: string | null
          divisa: string | null
          factura_id: number | null
          fecha: string
          id: number
          metodo_pago: string | null
          monto: number
          notas: string | null
          proveedor: string | null
          referencia: string | null
          tipo_movimiento: string
          usuario_id: number | null
        }
        Insert: {
          categoria?: string | null
          cliente_id?: number | null
          concepto: string
          created_at?: string | null
          cuenta_cobrar_id?: number | null
          descripcion?: string | null
          divisa?: string | null
          factura_id?: number | null
          fecha?: string
          id?: number
          metodo_pago?: string | null
          monto: number
          notas?: string | null
          proveedor?: string | null
          referencia?: string | null
          tipo_movimiento: string
          usuario_id?: number | null
        }
        Update: {
          categoria?: string | null
          cliente_id?: number | null
          concepto?: string
          created_at?: string | null
          cuenta_cobrar_id?: number | null
          descripcion?: string | null
          divisa?: string | null
          factura_id?: number | null
          fecha?: string
          id?: number
          metodo_pago?: string | null
          monto?: number
          notas?: string | null
          proveedor?: string | null
          referencia?: string | null
          tipo_movimiento?: string
          usuario_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cuadre_caja_cuenta_cobrar_id_fkey"
            columns: ["cuenta_cobrar_id"]
            isOneToOne: false
            referencedRelation: "cuentas_por_cobrar"
            referencedColumns: ["id"]
          },
        ]
      }
      cuentas_por_cobrar: {
        Row: {
          cedula: string | null
          cliente: string
          cliente_id: number | null
          created_at: string | null
          divisa: string | null
          estado: string | null
          fecha_emision: string
          fecha_vencimiento: string | null
          id: number
          monto_interes: number
          monto_pendiente: number
          monto_principal: number
          monto_total: number
          notas: string | null
          referencia: string
          tipo: string
        }
        Insert: {
          cedula?: string | null
          cliente: string
          cliente_id?: number | null
          created_at?: string | null
          divisa?: string | null
          estado?: string | null
          fecha_emision: string
          fecha_vencimiento?: string | null
          id?: number
          monto_interes?: number
          monto_pendiente: number
          monto_principal?: number
          monto_total: number
          notas?: string | null
          referencia: string
          tipo: string
        }
        Update: {
          cedula?: string | null
          cliente?: string
          cliente_id?: number | null
          created_at?: string | null
          divisa?: string | null
          estado?: string | null
          fecha_emision?: string
          fecha_vencimiento?: string | null
          id?: number
          monto_interes?: number
          monto_pendiente?: number
          monto_principal?: number
          monto_total?: number
          notas?: string | null
          referencia?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_por_cobrar_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cuentas_por_pagar_suplidores: {
        Row: {
          created_at: string | null
          descripcion: string | null
          estado: string | null
          fecha_factura: string
          fecha_vencimiento: string | null
          id: number
          monto: number
          numero_factura: string
          suplidor_id: number | null
          suplidor_nombre: string
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          fecha_factura: string
          fecha_vencimiento?: string | null
          id?: number
          monto: number
          numero_factura: string
          suplidor_id?: number | null
          suplidor_nombre: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          fecha_factura?: string
          fecha_vencimiento?: string | null
          id?: number
          monto?: number
          numero_factura?: string
          suplidor_id?: number | null
          suplidor_nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_por_pagar_suplidores_suplidor_id_fkey"
            columns: ["suplidor_id"]
            isOneToOne: false
            referencedRelation: "suplidores"
            referencedColumns: ["id"]
          },
        ]
      }
      depreciacion_activos: {
        Row: {
          activo_id: number | null
          depreciacion_acumulada: number
          depreciacion_mensual: number
          fecha_registro: string | null
          id: number
          notas: string | null
          periodo: string
          valor_en_libros: number
        }
        Insert: {
          activo_id?: number | null
          depreciacion_acumulada: number
          depreciacion_mensual: number
          fecha_registro?: string | null
          id?: number
          notas?: string | null
          periodo: string
          valor_en_libros: number
        }
        Update: {
          activo_id?: number | null
          depreciacion_acumulada?: number
          depreciacion_mensual?: number
          fecha_registro?: string | null
          id?: number
          notas?: string | null
          periodo?: string
          valor_en_libros?: number
        }
        Relationships: [
          {
            foreignKeyName: "depreciacion_activos_activo_id_fkey"
            columns: ["activo_id"]
            isOneToOne: false
            referencedRelation: "activos_fijos"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados: {
        Row: {
          activo: boolean | null
          cargo: string
          cedula: string
          created_at: string | null
          direccion: string | null
          fecha_ingreso: string
          id: number
          nombre: string
          salario: number
          telefono: string | null
        }
        Insert: {
          activo?: boolean | null
          cargo: string
          cedula: string
          created_at?: string | null
          direccion?: string | null
          fecha_ingreso: string
          id?: number
          nombre: string
          salario: number
          telefono?: string | null
        }
        Update: {
          activo?: boolean | null
          cargo?: string
          cedula?: string
          created_at?: string | null
          direccion?: string | null
          fecha_ingreso?: string
          id?: number
          nombre?: string
          salario?: number
          telefono?: string | null
        }
        Relationships: []
      }
      facturas_compra: {
        Row: {
          aplicar_itbis: boolean | null
          balance_pendiente: number
          created_at: string | null
          divisa: string | null
          estado: string | null
          fecha: string
          fecha_vencimiento: string | null
          id: number
          itbis: number | null
          metodo_pago: string | null
          monto_pagado: number | null
          notas: string | null
          numero_factura: string
          subtotal: number
          suplidor_id: number | null
          tasa_cambio: number | null
          total: number
        }
        Insert: {
          aplicar_itbis?: boolean | null
          balance_pendiente: number
          created_at?: string | null
          divisa?: string | null
          estado?: string | null
          fecha: string
          fecha_vencimiento?: string | null
          id?: number
          itbis?: number | null
          metodo_pago?: string | null
          monto_pagado?: number | null
          notas?: string | null
          numero_factura: string
          subtotal: number
          suplidor_id?: number | null
          tasa_cambio?: number | null
          total: number
        }
        Update: {
          aplicar_itbis?: boolean | null
          balance_pendiente?: number
          created_at?: string | null
          divisa?: string | null
          estado?: string | null
          fecha?: string
          fecha_vencimiento?: string | null
          id?: number
          itbis?: number | null
          metodo_pago?: string | null
          monto_pagado?: number | null
          notas?: string | null
          numero_factura?: string
          subtotal?: number
          suplidor_id?: number | null
          tasa_cambio?: number | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "facturas_compra_suplidor_id_fkey"
            columns: ["suplidor_id"]
            isOneToOne: false
            referencedRelation: "suplidores"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas_factoria: {
        Row: {
          cantidad_sacos: number
          cliente: string
          created_at: string | null
          estado_pago: string | null
          fanegas: number
          fecha: string
          fecha_pago: string | null
          humedad: number
          id: number
          kilos_bruto: number
          kilos_neto: number
          nombre_factoria: string
          notas: string | null
          numero_pesada: string | null
          precio_fanega: number
          user_id: string | null
          valor_pagar: number
        }
        Insert: {
          cantidad_sacos: number
          cliente: string
          created_at?: string | null
          estado_pago?: string | null
          fanegas: number
          fecha: string
          fecha_pago?: string | null
          humedad: number
          id?: number
          kilos_bruto: number
          kilos_neto: number
          nombre_factoria: string
          notas?: string | null
          numero_pesada?: string | null
          precio_fanega: number
          user_id?: string | null
          valor_pagar: number
        }
        Update: {
          cantidad_sacos?: number
          cliente?: string
          created_at?: string | null
          estado_pago?: string | null
          fanegas?: number
          fecha?: string
          fecha_pago?: string | null
          humedad?: number
          id?: number
          kilos_bruto?: number
          kilos_neto?: number
          nombre_factoria?: string
          notas?: string | null
          numero_pesada?: string | null
          precio_fanega?: number
          user_id?: string | null
          valor_pagar?: number
        }
        Relationships: [
          {
            foreignKeyName: "facturas_factoria_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas_venta: {
        Row: {
          balance_pendiente: number
          cliente_id: number | null
          created_at: string | null
          descuento_monto: number | null
          descuento_porcentaje: number | null
          divisa: string | null
          estado: string | null
          fecha: string
          firma_cliente: string | null
          id: number
          itbis: number | null
          monto_pagado: number | null
          notas: string | null
          numero_factura: string
          subtotal: number
          tasa_cambio: number | null
          total: number
        }
        Insert: {
          balance_pendiente: number
          cliente_id?: number | null
          created_at?: string | null
          descuento_monto?: number | null
          descuento_porcentaje?: number | null
          divisa?: string | null
          estado?: string | null
          fecha: string
          firma_cliente?: string | null
          id?: number
          itbis?: number | null
          monto_pagado?: number | null
          notas?: string | null
          numero_factura: string
          subtotal: number
          tasa_cambio?: number | null
          total: number
        }
        Update: {
          balance_pendiente?: number
          cliente_id?: number | null
          created_at?: string | null
          descuento_monto?: number | null
          descuento_porcentaje?: number | null
          divisa?: string | null
          estado?: string | null
          fecha?: string
          firma_cliente?: string | null
          id?: number
          itbis?: number | null
          monto_pagado?: number | null
          notas?: string | null
          numero_factura?: string
          subtotal?: number
          tasa_cambio?: number | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "facturas_venta_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      financiamientos: {
        Row: {
          balance_pendiente: number
          cedula_cliente: string
          cliente_id: number | null
          created_at: string | null
          divisa: string | null
          estado: string | null
          fecha_prestamo: string
          fecha_vencimiento: string
          id: number
          interes_generado: number
          monto_prestado: number
          nombre_cliente: string
          notas: string | null
          plazo_meses: number
          tasa_interes: number | null
          total_pagar: number
        }
        Insert: {
          balance_pendiente: number
          cedula_cliente: string
          cliente_id?: number | null
          created_at?: string | null
          divisa?: string | null
          estado?: string | null
          fecha_prestamo: string
          fecha_vencimiento: string
          id?: number
          interes_generado: number
          monto_prestado: number
          nombre_cliente: string
          notas?: string | null
          plazo_meses: number
          tasa_interes?: number | null
          total_pagar: number
        }
        Update: {
          balance_pendiente?: number
          cedula_cliente?: string
          cliente_id?: number | null
          created_at?: string | null
          divisa?: string | null
          estado?: string | null
          fecha_prestamo?: string
          fecha_vencimiento?: string
          id?: number
          interes_generado?: number
          monto_prestado?: number
          nombre_cliente?: string
          notas?: string | null
          plazo_meses?: number
          tasa_interes?: number | null
          total_pagar?: number
        }
        Relationships: [
          {
            foreignKeyName: "prestamos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      financiamientos_bancarios: {
        Row: {
          banco: string
          created_at: string | null
          estado: string | null
          fecha_inicio: string
          fecha_vencimiento: string | null
          id: string
          monto_prestamo: number
          notas: string | null
          plazo_meses: number
          saldo_pendiente: number
          tasa_interes: number
        }
        Insert: {
          banco: string
          created_at?: string | null
          estado?: string | null
          fecha_inicio?: string
          fecha_vencimiento?: string | null
          id?: string
          monto_prestamo: number
          notas?: string | null
          plazo_meses: number
          saldo_pendiente: number
          tasa_interes: number
        }
        Update: {
          banco?: string
          created_at?: string | null
          estado?: string | null
          fecha_inicio?: string
          fecha_vencimiento?: string | null
          id?: string
          monto_prestamo?: number
          notas?: string | null
          plazo_meses?: number
          saldo_pendiente?: number
          tasa_interes?: number
        }
        Relationships: []
      }
      fletes: {
        Row: {
          cantidad_sacos: number
          chofer: string
          created_at: string | null
          factoria: string
          fecha: string
          finca: string
          id: string
          lugar: string
          numero_pesada: string
          pesada_id: string | null
          pesador: string
          placa: string
          precio_flete: number
          productor: string
          reconciliado: boolean | null
          user_id: string | null
          valor_total_flete: number
          variedad: string
        }
        Insert: {
          cantidad_sacos: number
          chofer: string
          created_at?: string | null
          factoria: string
          fecha: string
          finca: string
          id?: string
          lugar: string
          numero_pesada: string
          pesada_id?: string | null
          pesador: string
          placa: string
          precio_flete?: number
          productor: string
          reconciliado?: boolean | null
          user_id?: string | null
          valor_total_flete?: number
          variedad: string
        }
        Update: {
          cantidad_sacos?: number
          chofer?: string
          created_at?: string | null
          factoria?: string
          fecha?: string
          finca?: string
          id?: string
          lugar?: string
          numero_pesada?: string
          pesada_id?: string | null
          pesador?: string
          placa?: string
          precio_flete?: number
          productor?: string
          reconciliado?: boolean | null
          user_id?: string | null
          valor_total_flete?: number
          variedad?: string
        }
        Relationships: [
          {
            foreignKeyName: "fletes_pesada_id_fkey"
            columns: ["pesada_id"]
            isOneToOne: false
            referencedRelation: "pesadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fletes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos: {
        Row: {
          categoria: string
          created_at: string | null
          descripcion: string
          fecha: string
          id: number
          metodo_pago: string | null
          monto: number
          notas: string | null
          proveedor: string | null
          referencia: string | null
        }
        Insert: {
          categoria: string
          created_at?: string | null
          descripcion: string
          fecha: string
          id?: number
          metodo_pago?: string | null
          monto: number
          notas?: string | null
          proveedor?: string | null
          referencia?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string | null
          descripcion?: string
          fecha?: string
          id?: number
          metodo_pago?: string | null
          monto?: number
          notas?: string | null
          proveedor?: string | null
          referencia?: string | null
        }
        Relationships: []
      }
      gastos_flete: {
        Row: {
          chofer: string | null
          created_at: string | null
          descripcion: string | null
          fecha: string
          flete_id: string | null
          id: string
          monto: number
          tipo: string
        }
        Insert: {
          chofer?: string | null
          created_at?: string | null
          descripcion?: string | null
          fecha: string
          flete_id?: string | null
          id?: string
          monto: number
          tipo: string
        }
        Update: {
          chofer?: string | null
          created_at?: string | null
          descripcion?: string | null
          fecha?: string
          flete_id?: string | null
          id?: string
          monto?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "gastos_flete_flete_id_fkey"
            columns: ["flete_id"]
            isOneToOne: false
            referencedRelation: "fletes"
            referencedColumns: ["id"]
          },
        ]
      }
      items_factura_compra: {
        Row: {
          cantidad: number
          created_at: string | null
          divisa: string | null
          factura_compra_id: number | null
          fecha_vencimiento: string | null
          id: number
          mercancia_id: number | null
          precio_unitario: number
          precio_venta_1: number | null
          precio_venta_2: number | null
          precio_venta_3: number | null
          subtotal: number
        }
        Insert: {
          cantidad: number
          created_at?: string | null
          divisa?: string | null
          factura_compra_id?: number | null
          fecha_vencimiento?: string | null
          id?: number
          mercancia_id?: number | null
          precio_unitario: number
          precio_venta_1?: number | null
          precio_venta_2?: number | null
          precio_venta_3?: number | null
          subtotal: number
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          divisa?: string | null
          factura_compra_id?: number | null
          fecha_vencimiento?: string | null
          id?: number
          mercancia_id?: number | null
          precio_unitario?: number
          precio_venta_1?: number | null
          precio_venta_2?: number | null
          precio_venta_3?: number | null
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_factura_compra_factura_compra_id_fkey"
            columns: ["factura_compra_id"]
            isOneToOne: false
            referencedRelation: "facturas_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_factura_compra_mercancia_id_fkey"
            columns: ["mercancia_id"]
            isOneToOne: false
            referencedRelation: "mercancias"
            referencedColumns: ["id"]
          },
        ]
      }
      items_factura_venta: {
        Row: {
          cantidad: number
          created_at: string | null
          factura_venta_id: number | null
          id: number
          mercancia_id: number | null
          precio_unitario: number
          subtotal: number
        }
        Insert: {
          cantidad: number
          created_at?: string | null
          factura_venta_id?: number | null
          id?: number
          mercancia_id?: number | null
          precio_unitario: number
          subtotal: number
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          factura_venta_id?: number | null
          id?: number
          mercancia_id?: number | null
          precio_unitario?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_factura_venta_factura_venta_id_fkey"
            columns: ["factura_venta_id"]
            isOneToOne: false
            referencedRelation: "facturas_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_factura_venta_mercancia_id_fkey"
            columns: ["mercancia_id"]
            isOneToOne: false
            referencedRelation: "mercancias"
            referencedColumns: ["id"]
          },
        ]
      }
      libro_diario: {
        Row: {
          created_at: string | null
          cuenta_codigo: string
          cuenta_id: number | null
          cuenta_nombre: string
          debe: number | null
          descripcion: string
          fecha: string
          haber: number | null
          id: number
          modulo_origen: string | null
          numero_asiento: string
          referencia: string | null
        }
        Insert: {
          created_at?: string | null
          cuenta_codigo: string
          cuenta_id?: number | null
          cuenta_nombre: string
          debe?: number | null
          descripcion: string
          fecha: string
          haber?: number | null
          id?: number
          modulo_origen?: string | null
          numero_asiento: string
          referencia?: string | null
        }
        Update: {
          created_at?: string | null
          cuenta_codigo?: string
          cuenta_id?: number | null
          cuenta_nombre?: string
          debe?: number | null
          descripcion?: string
          fecha?: string
          haber?: number | null
          id?: number
          modulo_origen?: string | null
          numero_asiento?: string
          referencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "libro_diario_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "catalogo_cuentas"
            referencedColumns: ["id"]
          },
        ]
      }
      mantenimientos_activos: {
        Row: {
          activo_id: number | null
          costo: number
          descripcion: string | null
          fecha_mantenimiento: string
          fecha_registro: string | null
          id: number
          moneda: string
          proveedor: string | null
          proximo_mantenimiento: string | null
          realizado_por: string | null
          tipo_mantenimiento: string
        }
        Insert: {
          activo_id?: number | null
          costo: number
          descripcion?: string | null
          fecha_mantenimiento: string
          fecha_registro?: string | null
          id?: number
          moneda?: string
          proveedor?: string | null
          proximo_mantenimiento?: string | null
          realizado_por?: string | null
          tipo_mantenimiento: string
        }
        Update: {
          activo_id?: number | null
          costo?: number
          descripcion?: string | null
          fecha_mantenimiento?: string
          fecha_registro?: string | null
          id?: number
          moneda?: string
          proveedor?: string | null
          proximo_mantenimiento?: string | null
          realizado_por?: string | null
          tipo_mantenimiento?: string
        }
        Relationships: [
          {
            foreignKeyName: "mantenimientos_activos_activo_id_fkey"
            columns: ["activo_id"]
            isOneToOne: false
            referencedRelation: "activos_fijos"
            referencedColumns: ["id"]
          },
        ]
      }
      mercancias: {
        Row: {
          activo: boolean | null
          categoria: string | null
          codigo: string
          created_at: string | null
          descripcion: string | null
          id: number
          nombre: string
          precio_1: number | null
          precio_2: number | null
          precio_3: number | null
          precio_compra: number | null
          precio_venta: number
          precio_venta_dop: number | null
          precio_venta_usd: number | null
          stock_actual: number | null
          stock_minimo: number | null
          unidad_medida: string
        }
        Insert: {
          activo?: boolean | null
          categoria?: string | null
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre: string
          precio_1?: number | null
          precio_2?: number | null
          precio_3?: number | null
          precio_compra?: number | null
          precio_venta: number
          precio_venta_dop?: number | null
          precio_venta_usd?: number | null
          stock_actual?: number | null
          stock_minimo?: number | null
          unidad_medida: string
        }
        Update: {
          activo?: boolean | null
          categoria?: string | null
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre?: string
          precio_1?: number | null
          precio_2?: number | null
          precio_3?: number | null
          precio_compra?: number | null
          precio_venta?: number
          precio_venta_dop?: number | null
          precio_venta_usd?: number | null
          stock_actual?: number | null
          stock_minimo?: number | null
          unidad_medida?: string
        }
        Relationships: []
      }
      modulos: {
        Row: {
          codigo: string
          created_at: string | null
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre: string
        }
        Update: {
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      movimientos_caja: {
        Row: {
          concepto: string
          created_at: string | null
          fecha: string
          id: number
          metodo_pago: string | null
          monto: number
          notas: string | null
          referencia: string | null
          tipo: string
        }
        Insert: {
          concepto: string
          created_at?: string | null
          fecha: string
          id?: number
          metodo_pago?: string | null
          monto: number
          notas?: string | null
          referencia?: string | null
          tipo: string
        }
        Update: {
          concepto?: string
          created_at?: string | null
          fecha?: string
          id?: number
          metodo_pago?: string | null
          monto?: number
          notas?: string | null
          referencia?: string | null
          tipo?: string
        }
        Relationships: []
      }
      nom_acciones_personal: {
        Row: {
          aprobado_por: string | null
          created_at: string | null
          detalle: string | null
          documento_url: string | null
          empleado_id: string | null
          fecha_accion: string
          id: string
          tipo_accion: string
        }
        Insert: {
          aprobado_por?: string | null
          created_at?: string | null
          detalle?: string | null
          documento_url?: string | null
          empleado_id?: string | null
          fecha_accion: string
          id?: string
          tipo_accion: string
        }
        Update: {
          aprobado_por?: string | null
          created_at?: string | null
          detalle?: string | null
          documento_url?: string | null
          empleado_id?: string | null
          fecha_accion?: string
          id?: string
          tipo_accion?: string
        }
        Relationships: [
          {
            foreignKeyName: "nom_acciones_personal_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "nom_empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      nom_adelantos: {
        Row: {
          created_at: string | null
          empleado_id: string | null
          estado: string | null
          fecha_descuento: string | null
          fecha_solicitud: string | null
          id: string
          monto: number
          motivo: string | null
        }
        Insert: {
          created_at?: string | null
          empleado_id?: string | null
          estado?: string | null
          fecha_descuento?: string | null
          fecha_solicitud?: string | null
          id?: string
          monto: number
          motivo?: string | null
        }
        Update: {
          created_at?: string | null
          empleado_id?: string | null
          estado?: string | null
          fecha_descuento?: string | null
          fecha_solicitud?: string | null
          id?: string
          monto?: number
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nom_adelantos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "nom_empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      nom_candidatos: {
        Row: {
          apellido: string
          cedula: string | null
          created_at: string | null
          curriculum_url: string | null
          email: string | null
          estado: string | null
          fecha_aplicacion: string | null
          id: string
          nombre: string
          notas: string | null
          puesto_aplicado_id: string | null
          telefono: string | null
        }
        Insert: {
          apellido: string
          cedula?: string | null
          created_at?: string | null
          curriculum_url?: string | null
          email?: string | null
          estado?: string | null
          fecha_aplicacion?: string | null
          id?: string
          nombre: string
          notas?: string | null
          puesto_aplicado_id?: string | null
          telefono?: string | null
        }
        Update: {
          apellido?: string
          cedula?: string | null
          created_at?: string | null
          curriculum_url?: string | null
          email?: string | null
          estado?: string | null
          fecha_aplicacion?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          puesto_aplicado_id?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nom_candidatos_puesto_aplicado_id_fkey"
            columns: ["puesto_aplicado_id"]
            isOneToOne: false
            referencedRelation: "nom_puestos"
            referencedColumns: ["id"]
          },
        ]
      }
      nom_cuotas_prestamos: {
        Row: {
          created_at: string | null
          estado: string | null
          fecha_pago: string | null
          fecha_vencimiento: string
          id: string
          monto_cuota: number
          numero_cuota: number
          prestamo_id: string | null
        }
        Insert: {
          created_at?: string | null
          estado?: string | null
          fecha_pago?: string | null
          fecha_vencimiento: string
          id?: string
          monto_cuota: number
          numero_cuota: number
          prestamo_id?: string | null
        }
        Update: {
          created_at?: string | null
          estado?: string | null
          fecha_pago?: string | null
          fecha_vencimiento?: string
          id?: string
          monto_cuota?: number
          numero_cuota?: number
          prestamo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nom_cuotas_prestamos_prestamo_id_fkey"
            columns: ["prestamo_id"]
            isOneToOne: false
            referencedRelation: "nom_prestamos"
            referencedColumns: ["id"]
          },
        ]
      }
      nom_departamentos: {
        Row: {
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      nom_detalle_nomina: {
        Row: {
          created_at: string | null
          detalle_deducciones: Json | null
          detalle_incentivos: Json | null
          empleado_id: string | null
          id: string
          nomina_id: string | null
          salario_bruto: number
          salario_neto: number
          total_deducciones: number | null
          total_incentivos: number | null
        }
        Insert: {
          created_at?: string | null
          detalle_deducciones?: Json | null
          detalle_incentivos?: Json | null
          empleado_id?: string | null
          id?: string
          nomina_id?: string | null
          salario_bruto: number
          salario_neto: number
          total_deducciones?: number | null
          total_incentivos?: number | null
        }
        Update: {
          created_at?: string | null
          detalle_deducciones?: Json | null
          detalle_incentivos?: Json | null
          empleado_id?: string | null
          id?: string
          nomina_id?: string | null
          salario_bruto?: number
          salario_neto?: number
          total_deducciones?: number | null
          total_incentivos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nom_detalle_nomina_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "nom_empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nom_detalle_nomina_nomina_id_fkey"
            columns: ["nomina_id"]
            isOneToOne: false
            referencedRelation: "nom_nominas"
            referencedColumns: ["id"]
          },
        ]
      }
      nom_empleados: {
        Row: {
          apellido: string
          cedula: string | null
          codigo: string | null
          created_at: string | null
          cuenta_bancaria: string | null
          departamento_id: string | null
          direccion: string | null
          email: string | null
          estado: string | null
          estado_civil: string | null
          fecha_ingreso: string
          fecha_nacimiento: string | null
          foto_url: string | null
          genero: string | null
          id: string
          nombre: string
          puesto_id: string | null
          salario_base: number
          telefono: string | null
        }
        Insert: {
          apellido: string
          cedula?: string | null
          codigo?: string | null
          created_at?: string | null
          cuenta_bancaria?: string | null
          departamento_id?: string | null
          direccion?: string | null
          email?: string | null
          estado?: string | null
          estado_civil?: string | null
          fecha_ingreso: string
          fecha_nacimiento?: string | null
          foto_url?: string | null
          genero?: string | null
          id?: string
          nombre: string
          puesto_id?: string | null
          salario_base: number
          telefono?: string | null
        }
        Update: {
          apellido?: string
          cedula?: string | null
          codigo?: string | null
          created_at?: string | null
          cuenta_bancaria?: string | null
          departamento_id?: string | null
          direccion?: string | null
          email?: string | null
          estado?: string | null
          estado_civil?: string | null
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          foto_url?: string | null
          genero?: string | null
          id?: string
          nombre?: string
          puesto_id?: string | null
          salario_base?: number
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nom_empleados_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "nom_departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nom_empleados_puesto_id_fkey"
            columns: ["puesto_id"]
            isOneToOne: false
            referencedRelation: "nom_puestos"
            referencedColumns: ["id"]
          },
        ]
      }
      nom_incentivos: {
        Row: {
          created_at: string | null
          descripcion: string | null
          empleado_id: string | null
          estado: string | null
          fecha: string | null
          id: string
          monto: number
          tipo_incentivo_id: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          empleado_id?: string | null
          estado?: string | null
          fecha?: string | null
          id?: string
          monto: number
          tipo_incentivo_id?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          empleado_id?: string | null
          estado?: string | null
          fecha?: string | null
          id?: string
          monto?: number
          tipo_incentivo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nom_incentivos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "nom_empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nom_incentivos_tipo_incentivo_id_fkey"
            columns: ["tipo_incentivo_id"]
            isOneToOne: false
            referencedRelation: "nom_tipos_incentivos"
            referencedColumns: ["id"]
          },
        ]
      }
      nom_nominas: {
        Row: {
          created_at: string | null
          estado: string | null
          fecha_fin: string
          fecha_inicio: string
          fecha_pago: string | null
          id: string
          notas: string | null
          tipo: string
          total_pagado: number | null
        }
        Insert: {
          created_at?: string | null
          estado?: string | null
          fecha_fin: string
          fecha_inicio: string
          fecha_pago?: string | null
          id?: string
          notas?: string | null
          tipo: string
          total_pagado?: number | null
        }
        Update: {
          created_at?: string | null
          estado?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          fecha_pago?: string | null
          id?: string
          notas?: string | null
          tipo?: string
          total_pagado?: number | null
        }
        Relationships: []
      }
      nom_prestamos: {
        Row: {
          created_at: string | null
          cuota_mensual: number
          empleado_id: string | null
          estado: string | null
          fecha_inicio: string
          id: string
          monto: number
          motivo: string | null
          plazo_meses: number
          saldo_pendiente: number
          tasa_interes: number | null
        }
        Insert: {
          created_at?: string | null
          cuota_mensual: number
          empleado_id?: string | null
          estado?: string | null
          fecha_inicio: string
          id?: string
          monto: number
          motivo?: string | null
          plazo_meses: number
          saldo_pendiente: number
          tasa_interes?: number | null
        }
        Update: {
          created_at?: string | null
          cuota_mensual?: number
          empleado_id?: string | null
          estado?: string | null
          fecha_inicio?: string
          id?: string
          monto?: number
          motivo?: string | null
          plazo_meses?: number
          saldo_pendiente?: number
          tasa_interes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nom_prestamos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "nom_empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      nom_puestos: {
        Row: {
          created_at: string | null
          departamento_id: string | null
          descripcion: string | null
          id: string
          nombre: string
          salario_max: number | null
          salario_min: number | null
        }
        Insert: {
          created_at?: string | null
          departamento_id?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          salario_max?: number | null
          salario_min?: number | null
        }
        Update: {
          created_at?: string | null
          departamento_id?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          salario_max?: number | null
          salario_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nom_puestos_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "nom_departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      nom_tipos_incentivos: {
        Row: {
          created_at: string | null
          descripcion: string | null
          es_fijo: boolean | null
          id: string
          monto_defecto: number | null
          nombre: string
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          es_fijo?: boolean | null
          id?: string
          monto_defecto?: number | null
          nombre: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          es_fijo?: boolean | null
          id?: string
          monto_defecto?: number | null
          nombre?: string
        }
        Relationships: []
      }
      nomina: {
        Row: {
          bonificaciones: number | null
          created_at: string | null
          deducciones: number | null
          empleado_id: number | null
          empleado_nombre: string
          estado: string | null
          fecha_pago: string | null
          id: number
          notas: string | null
          periodo_fin: string
          periodo_inicio: string
          salario_base: number
          total_pagar: number
        }
        Insert: {
          bonificaciones?: number | null
          created_at?: string | null
          deducciones?: number | null
          empleado_id?: number | null
          empleado_nombre: string
          estado?: string | null
          fecha_pago?: string | null
          id?: number
          notas?: string | null
          periodo_fin: string
          periodo_inicio: string
          salario_base: number
          total_pagar: number
        }
        Update: {
          bonificaciones?: number | null
          created_at?: string | null
          deducciones?: number | null
          empleado_id?: number | null
          empleado_nombre?: string
          estado?: string | null
          fecha_pago?: string | null
          id?: number
          notas?: string | null
          periodo_fin?: string
          periodo_inicio?: string
          salario_base?: number
          total_pagar?: number
        }
        Relationships: [
          {
            foreignKeyName: "nomina_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_credito: {
        Row: {
          cliente_nombre: string
          created_at: string | null
          estado: string | null
          fecha: string
          id: string
          monto: number
          notas: string | null
          numero_nota: string
          origen: string
          referencia_id: string | null
          user_id: string | null
        }
        Insert: {
          cliente_nombre: string
          created_at?: string | null
          estado?: string | null
          fecha?: string
          id?: string
          monto: number
          notas?: string | null
          numero_nota: string
          origen: string
          referencia_id?: string | null
          user_id?: string | null
        }
        Update: {
          cliente_nombre?: string
          created_at?: string | null
          estado?: string | null
          fecha?: string
          id?: string
          monto?: number
          notas?: string | null
          numero_nota?: string
          origen?: string
          referencia_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pagos_financiamientos: {
        Row: {
          created_at: string | null
          fecha_pago: string
          financiamiento_id: string | null
          id: string
          monto_pagado: number
          nota: string | null
          saldo_restante: number
        }
        Insert: {
          created_at?: string | null
          fecha_pago?: string
          financiamiento_id?: string | null
          id?: string
          monto_pagado: number
          nota?: string | null
          saldo_restante: number
        }
        Update: {
          created_at?: string | null
          fecha_pago?: string
          financiamiento_id?: string | null
          id?: string
          monto_pagado?: number
          nota?: string | null
          saldo_restante?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagos_financiamientos_financiamiento_id_fkey"
            columns: ["financiamiento_id"]
            isOneToOne: false
            referencedRelation: "financiamientos_bancarios"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_obreros: {
        Row: {
          cantidad_sacos: number
          cedula_obrero: string | null
          created_at: string | null
          departamento: string | null
          estado: string | null
          fecha: string
          id: string
          nombre_obrero: string
          pesada_id: string | null
          precio_saco: number
          tipo_pago: string | null
          total: number
          user_id: string | null
        }
        Insert: {
          cantidad_sacos: number
          cedula_obrero?: string | null
          created_at?: string | null
          departamento?: string | null
          estado?: string | null
          fecha: string
          id?: string
          nombre_obrero: string
          pesada_id?: string | null
          precio_saco: number
          tipo_pago?: string | null
          total: number
          user_id?: string | null
        }
        Update: {
          cantidad_sacos?: number
          cedula_obrero?: string | null
          created_at?: string | null
          departamento?: string | null
          estado?: string | null
          fecha?: string
          id?: string
          nombre_obrero?: string
          pesada_id?: string | null
          precio_saco?: number
          tipo_pago?: string | null
          total?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_obreros_pesada_id_fkey"
            columns: ["pesada_id"]
            isOneToOne: false
            referencedRelation: "pesadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_obreros_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_prestamos: {
        Row: {
          balance_actualizado: number
          created_at: string | null
          fecha_pago: string
          id: number
          monto_pagado: number
          notas: string | null
          prestamo_id: number | null
        }
        Insert: {
          balance_actualizado: number
          created_at?: string | null
          fecha_pago: string
          id?: number
          monto_pagado: number
          notas?: string | null
          prestamo_id?: number | null
        }
        Update: {
          balance_actualizado?: number
          created_at?: string | null
          fecha_pago?: string
          id?: number
          monto_pagado?: number
          notas?: string | null
          prestamo_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_prestamos_prestamo_id_fkey"
            columns: ["prestamo_id"]
            isOneToOne: false
            referencedRelation: "financiamientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_prestamos_prestamo_id_fkey"
            columns: ["prestamo_id"]
            isOneToOne: false
            referencedRelation: "vista_financiamientos_actualizados"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_suplidores: {
        Row: {
          created_at: string | null
          factura_compra_id: number | null
          fecha: string
          id: number
          metodo_pago: string | null
          monto: number
          notas: string | null
          referencia: string | null
          suplidor_id: number | null
        }
        Insert: {
          created_at?: string | null
          factura_compra_id?: number | null
          fecha: string
          id?: number
          metodo_pago?: string | null
          monto: number
          notas?: string | null
          referencia?: string | null
          suplidor_id?: number | null
        }
        Update: {
          created_at?: string | null
          factura_compra_id?: number | null
          fecha?: string
          id?: number
          metodo_pago?: string | null
          monto?: number
          notas?: string | null
          referencia?: string | null
          suplidor_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_suplidores_factura_compra_id_fkey"
            columns: ["factura_compra_id"]
            isOneToOne: false
            referencedRelation: "facturas_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_suplidores_suplidor_id_fkey"
            columns: ["suplidor_id"]
            isOneToOne: false
            referencedRelation: "suplidores"
            referencedColumns: ["id"]
          },
        ]
      }
      pasivos: {
        Row: {
          acreedor: string
          created_at: string | null
          descripcion: string
          estado: string | null
          fecha_registro: string
          fecha_vencimiento: string | null
          id: string
          monto: number
        }
        Insert: {
          acreedor: string
          created_at?: string | null
          descripcion: string
          estado?: string | null
          fecha_registro?: string
          fecha_vencimiento?: string | null
          id?: string
          monto: number
        }
        Update: {
          acreedor?: string
          created_at?: string | null
          descripcion?: string
          estado?: string | null
          fecha_registro?: string
          fecha_vencimiento?: string | null
          id?: string
          monto?: number
        }
        Relationships: []
      }
      permisos_usuario: {
        Row: {
          created_at: string | null
          id: number
          modulo_id: number | null
          puede_crear: boolean | null
          puede_editar: boolean | null
          puede_eliminar: boolean | null
          puede_ver: boolean | null
          usuario_id: string
          usuario_legacy_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          modulo_id?: number | null
          puede_crear?: boolean | null
          puede_editar?: boolean | null
          puede_eliminar?: boolean | null
          puede_ver?: boolean | null
          usuario_id: string
          usuario_legacy_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          modulo_id?: number | null
          puede_crear?: boolean | null
          puede_editar?: boolean | null
          puede_eliminar?: boolean | null
          puede_ver?: boolean | null
          usuario_id?: string
          usuario_legacy_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "permisos_usuario_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permisos_usuario_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios_sistema"
            referencedColumns: ["id"]
          },
        ]
      }
      pesadas: {
        Row: {
          avance_efectivo: number | null
          cantidad_sacos: number
          cliente_id: number | null
          created_at: string | null
          direccion: string | null
          fanegas: number
          fecha: string
          id: string
          kilos_bruto: number
          kilos_neto: number
          nombre_productor: string
          notas: string | null
          numero_pesada: string | null
          porcentaje_humedad: number
          precio_por_fanega: number
          saldo_disponible: number | null
          tara: number
          usado_compensacion: boolean | null
          user_id: string | null
          valor_total: number
          variedad: string
        }
        Insert: {
          avance_efectivo?: number | null
          cantidad_sacos: number
          cliente_id?: number | null
          created_at?: string | null
          direccion?: string | null
          fanegas: number
          fecha?: string
          id?: string
          kilos_bruto: number
          kilos_neto: number
          nombre_productor: string
          notas?: string | null
          numero_pesada?: string | null
          porcentaje_humedad: number
          precio_por_fanega: number
          saldo_disponible?: number | null
          tara: number
          usado_compensacion?: boolean | null
          user_id?: string | null
          valor_total: number
          variedad: string
        }
        Update: {
          avance_efectivo?: number | null
          cantidad_sacos?: number
          cliente_id?: number | null
          created_at?: string | null
          direccion?: string | null
          fanegas?: number
          fecha?: string
          id?: string
          kilos_bruto?: number
          kilos_neto?: number
          nombre_productor?: string
          notas?: string | null
          numero_pesada?: string | null
          porcentaje_humedad?: number
          precio_por_fanega?: number
          saldo_disponible?: number | null
          tara?: number
          usado_compensacion?: boolean | null
          user_id?: string | null
          valor_total?: number
          variedad?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesadas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesadas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          rating: number
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          id?: string
          rating: number
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          rating?: number
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string | null
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      saldo_clientes: {
        Row: {
          cliente_id: number | null
          id: number
          saldo_favor: number | null
          updated_at: string | null
        }
        Insert: {
          cliente_id?: number | null
          id?: number
          saldo_favor?: number | null
          updated_at?: string | null
        }
        Update: {
          cliente_id?: number | null
          id?: number
          saldo_favor?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saldo_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      salidas_pais: {
        Row: {
          cliente_id: number
          created_at: string | null
          fecha_regreso: string | null
          fecha_salida: string
          id: string
          notas: string | null
          pais_destino: string
          pais_origen: string
          updated_at: string | null
        }
        Insert: {
          cliente_id: number
          created_at?: string | null
          fecha_regreso?: string | null
          fecha_salida: string
          id?: string
          notas?: string | null
          pais_destino: string
          pais_origen: string
          updated_at?: string | null
        }
        Update: {
          cliente_id?: number
          created_at?: string | null
          fecha_regreso?: string | null
          fecha_salida?: string
          id?: string
          notas?: string | null
          pais_destino?: string
          pais_origen?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salidas_pais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      suplidores: {
        Row: {
          balance_pendiente: number | null
          created_at: string | null
          direccion: string | null
          email: string | null
          id: number
          nombre: string
          rnc: string | null
          telefono: string | null
        }
        Insert: {
          balance_pendiente?: number | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: number
          nombre: string
          rnc?: string | null
          telefono?: string | null
        }
        Update: {
          balance_pendiente?: number | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: number
          nombre?: string
          rnc?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          favorite_color: string | null
          id: string
          nombre: string
          password_hash: string
        }
        Insert: {
          created_at?: string | null
          email: string
          favorite_color?: string | null
          id?: string
          nombre: string
          password_hash: string
        }
        Update: {
          created_at?: string | null
          email?: string
          favorite_color?: string | null
          id?: string
          nombre?: string
          password_hash?: string
        }
        Relationships: []
      }
      usuarios_sistema: {
        Row: {
          activo: boolean | null
          created_at: string | null
          email: string
          id: string
          legacy_id: number
          nombre_completo: string
          password: string
          rol_id: number | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          legacy_id?: number
          nombre_completo: string
          password: string
          rol_id?: number | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          legacy_id?: number
          nombre_completo?: string
          password?: string
          rol_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_sistema_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      utilidad_neta: {
        Row: {
          costo_compra: number | null
          created_at: string | null
          descripcion: string
          fecha: string
          fletes: number | null
          id: number
          obreros: number | null
          otros_gastos: number | null
          referencia_id: number | null
          tipo: string
          utilidad: number | null
          venta_total: number | null
        }
        Insert: {
          costo_compra?: number | null
          created_at?: string | null
          descripcion: string
          fecha: string
          fletes?: number | null
          id?: number
          obreros?: number | null
          otros_gastos?: number | null
          referencia_id?: number | null
          tipo: string
          utilidad?: number | null
          venta_total?: number | null
        }
        Update: {
          costo_compra?: number | null
          created_at?: string | null
          descripcion?: string
          fecha?: string
          fletes?: number | null
          id?: number
          obreros?: number | null
          otros_gastos?: number | null
          referencia_id?: number | null
          tipo?: string
          utilidad?: number | null
          venta_total?: number | null
        }
        Relationships: []
      }
      ventas_diarias: {
        Row: {
          balance_pendiente: number | null
          cliente_id: number | null
          created_at: string | null
          estado: string | null
          factura_venta_id: number | null
          fecha: string
          id: number
          itbis: number
          metodo_pago: string | null
          monto_pagado: number | null
          numero_factura: string
          subtotal: number
          tipo_venta: string
          total: number
        }
        Insert: {
          balance_pendiente?: number | null
          cliente_id?: number | null
          created_at?: string | null
          estado?: string | null
          factura_venta_id?: number | null
          fecha: string
          id?: number
          itbis: number
          metodo_pago?: string | null
          monto_pagado?: number | null
          numero_factura: string
          subtotal: number
          tipo_venta: string
          total: number
        }
        Update: {
          balance_pendiente?: number | null
          cliente_id?: number | null
          created_at?: string | null
          estado?: string | null
          factura_venta_id?: number | null
          fecha?: string
          id?: number
          itbis?: number
          metodo_pago?: string | null
          monto_pagado?: number | null
          numero_factura?: string
          subtotal?: number
          tipo_venta?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "ventas_diarias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_diarias_factura_venta_id_fkey"
            columns: ["factura_venta_id"]
            isOneToOne: false
            referencedRelation: "facturas_venta"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas_diarias_items: {
        Row: {
          cantidad: number
          created_at: string | null
          id: number
          mercancia_id: number | null
          precio_unitario: number
          producto_nombre: string
          subtotal: number
          venta_id: number | null
        }
        Insert: {
          cantidad: number
          created_at?: string | null
          id?: number
          mercancia_id?: number | null
          precio_unitario: number
          producto_nombre: string
          subtotal: number
          venta_id?: number | null
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          id?: number
          mercancia_id?: number | null
          precio_unitario?: number
          producto_nombre?: string
          subtotal?: number
          venta_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_diarias_items_mercancia_id_fkey"
            columns: ["mercancia_id"]
            isOneToOne: false
            referencedRelation: "mercancias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vista_financiamientos_actualizados: {
        Row: {
          balance_pendiente: number | null
          cedula_cliente: string | null
          cliente_id: number | null
          created_at: string | null
          dias_transcurridos: number | null
          estado: string | null
          fecha_prestamo: string | null
          fecha_vencimiento: string | null
          id: number | null
          interes_acumulado_actual: number | null
          interes_diario: number | null
          monto_prestado: number | null
          nombre_cliente: string | null
          plazo_meses: number | null
          tasa_interes: number | null
          total_actualizado: number | null
        }
        Insert: {
          balance_pendiente?: number | null
          cedula_cliente?: string | null
          cliente_id?: number | null
          created_at?: string | null
          dias_transcurridos?: never
          estado?: string | null
          fecha_prestamo?: string | null
          fecha_vencimiento?: string | null
          id?: number | null
          interes_acumulado_actual?: never
          interes_diario?: never
          monto_prestado?: number | null
          nombre_cliente?: string | null
          plazo_meses?: number | null
          tasa_interes?: number | null
          total_actualizado?: never
        }
        Update: {
          balance_pendiente?: number | null
          cedula_cliente?: string | null
          cliente_id?: number | null
          created_at?: string | null
          dias_transcurridos?: never
          estado?: string | null
          fecha_prestamo?: string | null
          fecha_vencimiento?: string | null
          id?: number | null
          interes_acumulado_actual?: never
          interes_diario?: never
          monto_prestado?: number | null
          nombre_cliente?: string | null
          plazo_meses?: number | null
          tasa_interes?: number | null
          total_actualizado?: never
        }
        Relationships: [
          {
            foreignKeyName: "prestamos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_auth_users: {
        Args: {
          page_limit?: number
          page_offset?: number
          search_email?: string
        }
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          id: string
          last_sign_in_at: string
          total_count: number
        }[]
      }
      incrementar_contador: { Args: never; Returns: number }
      initialize_user_counter: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      unificar_clientes: {
        Args: {
          duplicate_client_ids: number[]
          primary_client_id: number
          updated_client_data: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
