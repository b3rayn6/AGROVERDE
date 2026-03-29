import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  Building2, 
  Briefcase, 
  FileText, 
  DollarSign, 
  CreditCard, 
  Wallet, 
  Award, 
  Calculator 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Empleados from './nomina/Empleados';
import Candidatos from './nomina/Candidatos';
import Departamentos from './nomina/Departamentos';
import Puestos from './nomina/Puestos';
import AccionesPersonal from './nomina/AccionesPersonal';
import Prestamos from './nomina/Prestamos';
import Adelantos from './nomina/Adelantos';
import Incentivos from './nomina/Incentivos';
import GenerarNomina from './nomina/GenerarNomina';

export default function Nomina() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'empleados', label: 'Empleados', icon: Users },
    { id: 'candidatos', label: 'Candidatos', icon: UserPlus },
    { id: 'departamentos', label: 'Departamentos', icon: Building2 },
    { id: 'puestos', label: 'Puestos', icon: Briefcase },
    { id: 'acciones', label: 'Acciones Personal', icon: FileText },
    { id: 'prestamos', label: 'Préstamos', icon: DollarSign },
    { id: 'adelantos', label: 'Adelantos', icon: CreditCard },
    { id: 'incentivos', label: 'Incentivos', icon: Award },
    { id: 'generar', label: 'Generar Nómina', icon: Calculator },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardNomina />;
      case 'empleados':
        return <Empleados />;
      case 'candidatos':
        return <Candidatos />;
      case 'departamentos':
        return <Departamentos />;
      case 'puestos':
        return <Puestos />;
      case 'acciones':
        return <AccionesPersonal />;
      case 'prestamos':
        return <Prestamos />;
      case 'adelantos':
        return <Adelantos />;
      case 'incentivos':
        return <Incentivos />;
      case 'generar':
        return <GenerarNomina />;
      default:
        return <DashboardNomina />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-600" />
            Nómina
          </h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {menuItems.find((item) => item.id === activeTab)?.label}
            </h1>
          </header>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

function DashboardNomina() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">--</div>
          <p className="text-xs text-muted-foreground">+0% desde el mes pasado</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Nómina Mensual</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$0.00</div>
          <p className="text-xs text-muted-foreground">+0% desde el mes pasado</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Préstamos Activos</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">Monto total: $0.00</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Candidatos Pendientes</CardTitle>
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">0 entrevistas programadas</p>
        </CardContent>
      </Card>
    </div>
  );
}
