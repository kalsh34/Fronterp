import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, PageHeader, FormField, Select, Button } from '../../components/ui';

export function FinanceReview() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [rates, setRates] = useState({ normalRate: 0, otRate: 0, holidayRate: 0 });
  const [periodForm, setPeriodForm] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1, monthName: '', startDate: '', endDate: '' });

  useEffect(() => { api.get('/finance/periods').then((res) => setPeriods(res.data.data || [])).catch(() => {}); }, []);

  useEffect(() => {
    if (selectedPeriod) {
      api.get(`/finance/rates/${selectedPeriod}`).then((res) => {
        if (res.data.data) setRates({ normalRate: res.data.data.normalRate, otRate: res.data.data.otRate, holidayRate: res.data.data.holidayRate });
      }).catch(() => {});
    }
  }, [selectedPeriod]);

  const handleSetRates = async () => {
    if (!selectedPeriod) return alert('Select a period');
    try {
      await api.put(`/finance/rates/${selectedPeriod}`, rates);
      alert('Rates saved');
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleCreatePeriod = async () => {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const body = { ...periodForm, monthName: monthNames[periodForm.month - 1], status: 'DRAFT' };
    try {
      await api.post('/finance/periods', body);
      const res = await api.get('/finance/periods');
      setPeriods(res.data.data || []);
      alert('Period created');
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleGenerateGuardPayroll = async () => {
    if (!selectedPeriod) return alert('Select a period');
    try {
      await api.post(`/guard-payroll/generate/${selectedPeriod}`);
      alert('Guard payroll records generated');
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <PageHeader title="Finance Review" subtitle="Manage payroll periods, rates, and generate payroll" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Payroll Period</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Year"
                type="number"
                value={periodForm.year}
                onChange={(e) => setPeriodForm({ ...periodForm, year: parseInt(e.target.value) })}
              />
              <Select
                label="Month"
                value={periodForm.month}
                onChange={(e) => setPeriodForm({ ...periodForm, month: parseInt(e.target.value) })}
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Start Date"
                type="date"
                value={periodForm.startDate}
                onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
              />
              <FormField
                label="End Date"
                type="date"
                value={periodForm.endDate}
                onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
              />
            </div>
            <Button onClick={handleCreatePeriod}>Create Period</Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll Rates</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <Select
              label="Select Period"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              placeholder="-- Select Period --"
            >
              {periods.map((p: any) => <option key={p._id} value={p._id}>{p.monthName} {p.year} ({p.status})</option>)}
            </Select>
            <FormField
              label="Normal Rate (ETB/hr)"
              type="number"
              step="0.01"
              value={rates.normalRate}
              onChange={(e) => setRates({ ...rates, normalRate: parseFloat(e.target.value) })}
            />
            <FormField
              label="OT Rate (ETB/hr)"
              type="number"
              step="0.01"
              value={rates.otRate}
              onChange={(e) => setRates({ ...rates, otRate: parseFloat(e.target.value) })}
            />
            <FormField
              label="Holiday Rate (ETB/hr)"
              type="number"
              step="0.01"
              value={rates.holidayRate}
              onChange={(e) => setRates({ ...rates, holidayRate: parseFloat(e.target.value) })}
            />
            <div className="flex gap-3">
              <Button onClick={handleSetRates}>Save Rates</Button>
              <Button variant="ghost" onClick={handleGenerateGuardPayroll}>Generate Guard Payroll</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
