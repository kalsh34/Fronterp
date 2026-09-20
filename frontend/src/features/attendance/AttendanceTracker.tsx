import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Select, 
  StatusBadge, 
  LoadingSpinner 
} from '../../components/ui';
import api from '../../lib/api';

interface Guard {
  id: string;
  name: string;
}

interface DailyAttendance {
  date: string;
  status: 'present' | 'absent' | 'late' | 'early' | 'overtime';
  hours: number;
  source: 'automatic' | 'manual';
}

interface MonthlyAttendance {
  guardId: string;
  month: string;
  attendance: DailyAttendance[];
  totalHours: number;
  totalDays: number;
}

const AttendanceTracker: React.FC = () => {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [selectedGuard, setSelectedGuard] = useState<string>('');
  const [monthlyData, setMonthlyData] = useState<MonthlyAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    const current = new Date(firstDay);
    while (current <= lastDay) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const formatDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const fetchGuards = useCallback(async () => {
    try {
      const response = await api.get('/guards');
      const data = response.data.data;
      setGuards(data);
      if (data.length > 0) {
        setSelectedGuard(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch guards:', error);
    }
  }, []);

  const fetchMonthlyAttendance = useCallback(async () => {
    if (!selectedGuard) return;
    
    try {
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const response = await api.get(
        `/attendance/monthly?guardId=${selectedGuard}&start=${formatDateStr(monthStart)}&end=${formatDateStr(monthEnd)}`
      );
      setMonthlyData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch monthly attendance:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedGuard, currentMonth]);

  useEffect(() => {
    fetchGuards();
  }, [fetchGuards]);

  useEffect(() => {
    fetchMonthlyAttendance();
  }, [fetchMonthlyAttendance]);

  const getStatusForDate = (date: Date): DailyAttendance | undefined => {
    if (!monthlyData) return undefined;
    const dateStr = formatDateStr(date);
    return monthlyData.attendance.find(a => a.date === dateStr);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Attendance Tracker</h2>
          
          <div className="flex items-center space-x-4">
            <Select
              value={selectedGuard}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedGuard(e.target.value)}
              placeholder="Select Guard"
            >
              {guards.map(guard => (
                <option key={guard.id} value={guard.id}>{guard.name}</option>
              ))}
            </Select>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {getDaysInMonth(currentMonth).map((date, index) => {
                const attendance = getStatusForDate(date);
                const isToday = formatDateStr(date) === formatDateStr(new Date());
                
                return (
                  <div
                    key={index}
                    className={`p-2 border rounded-md text-center ${
                      isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="text-sm font-medium">{date.getDate()}</div>
                    {attendance && (
                      <div className="mt-1">
                        <StatusBadge status={attendance.status} />
                        <div className="text-xs text-gray-500 mt-1">
                          {attendance.hours}h
                        </div>
                        <div className="text-xs text-gray-400">
                          {attendance.source === 'automatic' ? '📱' : '👤'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {monthlyData && (
              <div className="mt-6 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500">Total Hours:</span>
                    <span className="ml-2 font-semibold">{monthlyData.totalHours}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Days Present:</span>
                    <span className="ml-2 font-semibold">{monthlyData.totalDays}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AttendanceTracker;
