import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  Clock,
  DollarSign,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
 Download,
} from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/services/api';



interface TimeEntry {
  id: string;
  employee: string;
  employeeId?: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  status?: string;
}

interface EmployeeProfile {
  id: string;
  name: string;
  email?: string;
  role?: string;
  payType?: 'hourly' | 'monthly' | string;
  payRate?: string;
}

interface PayrollRecord {
  id: string;
  payPeriod: string;
  gross: number;
  net: number;
  taxes: number;
  deductions: number;
  pdfUrl?: string;
}

function parsePayRate(rate: string): number {
  const match = String(rate || '').match(
    /(\d+(?:\.\d+)?)/,
  );

  return match ? parseFloat(match[1]) : 0;
}

function parseMinutes(hhmm: string) {
  const [h, m] = String(hhmm || '')
    .split(':')
    .map((x) => Number(x));

  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return null;
  }

  return h * 60 + m;
}

function calcHoursWorked(
  clockIn: string,
  clockOut: string | null,
) {
  if (!clockOut) return 0;

  const inMin = parseMinutes(clockIn);
  const outMin = parseMinutes(clockOut);

  if (inMin === null || outMin === null) {
    return 0;
  }

  const diff = outMin - inMin;

  return diff > 0 ? diff / 60 : 0;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

function formatHours(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  return `${h}h ${m}m`;
}

function getMonthName(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export default function EmployeePayrollScreen() {
  const {
    isAuthenticated,
    isLoading,
    token: authToken,
  } = useAuth();

  const [loading, setLoading] = useState(true);

  const [employee, setEmployee] =
    useState<EmployeeProfile | null>(null);

  const [timeEntries, setTimeEntries] = useState<
    TimeEntry[]
  >([]);

  const [payHistory, setPayHistory] = useState<
    PayrollRecord[]
  >([]);

  const [currentMonth, setCurrentMonth] = useState(
    new Date(),
  );

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      loadData();
    }
  }, [currentMonth, isAuthenticated, isLoading]);

  async function apiRequest(
    endpoint: string,
    method = 'GET',
    body?: any,
  ) {
    try {
      let token = authToken;

      // fallback token from storage
      if (!token) {
        token = await AsyncStorage.getItem(
          'auth_token',
        );
      }

      console.log('TOKEN =>', token);

      const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: body
            ? JSON.stringify(body)
            : undefined,
        },
      );

      console.log(
        'API URL =>',
        `${API_BASE_URL}${endpoint}`,
      );

      console.log(
        'STATUS =>',
        response.status,
      );

      const text = await response.text();

      console.log('RAW RESPONSE =>', text);

      let data: any = {};

      try {
        data = JSON.parse(text);
      } catch (e) {
        console.log('JSON PARSE ERROR =>', e);
      }

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            data?.message ||
            'API request failed',
        );
      }

      return data;
    } catch (error) {
      console.log('API ERROR =>', error);
      throw error;
    }
  }

  async function loadData() {
    try {
      setLoading(true);

      // PROFILE
      const profileRes = await apiRequest(
        '/employees/me',
      );

      console.log(
        'PROFILE RESPONSE',
        profileRes,
      );

      const profile =
        profileRes?.item || null;

      setEmployee(profile);

      // TIME ENTRIES
      const timeRes = await apiRequest(
        '/employees/me/time-entry/history',
      );

      console.log('TIME RESPONSE', timeRes);

      const allEntries =
        timeRes?.items || [];

      const year = currentMonth.getFullYear();

      const month = currentMonth.getMonth();

      const startOfMonth = new Date(
        year,
        month,
        1,
      );

      const endOfMonth = new Date(
        year,
        month + 1,
        0,
        23,
        59,
        59,
      );

      const filteredEntries =
        allEntries.filter(
          (entry: TimeEntry) => {
            const entryDate = new Date(
              entry.date,
            );

            return (
              entryDate >= startOfMonth &&
              entryDate <= endOfMonth
            );
          },
        );

      setTimeEntries(filteredEntries);

      // PAYROLL
      const payrollRes = await apiRequest(
        `/employees/me/payroll?year=${year}`,
      );

      console.log(
        'PAYROLL RESPONSE',
        payrollRes,
      );

      const payrollItems =
        payrollRes?.items || [];

      setPayHistory(payrollItems);
    } catch (e: any) {
      console.log('PAYROLL ERROR =>', e);

      Alert.alert(
        'Error',
        e?.message ||
          'Failed to load payroll',
      );
    } finally {
      setLoading(false);
    }
  }

  const payroll = useMemo(() => {
    if (!employee) return null;

    const totalHours = timeEntries.reduce(
      (sum, entry) => {
        return (
          sum +
          calcHoursWorked(
            entry.clockIn,
            entry.clockOut,
          )
        );
      },
      0,
    );

    const isMonthly =
      employee.payType === 'monthly';

    const payRateValue = parsePayRate(
      employee.payRate || '0',
    );

    let regularHours = 0;
    let overtimeHours = 0;
    let regularPay = 0;
    let overtimePay = 0;
    let totalPay = 0;
    let hourlyRate = 0;
    let monthlySalary = 0;

    if (isMonthly) {
      monthlySalary = payRateValue;

      hourlyRate = payRateValue / 160;

      regularHours = totalHours;

      regularPay = monthlySalary;

      totalPay = monthlySalary;
    } else {
      hourlyRate = payRateValue;

      regularHours = Math.min(
        totalHours,
        160,
      );

      overtimeHours = Math.max(
        0,
        totalHours - 160,
      );

      const overtimeRate =
        hourlyRate * 1.5;

      regularPay =
        regularHours * hourlyRate;

      overtimePay =
        overtimeHours * overtimeRate;

      totalPay =
        regularPay + overtimePay;
    }

    const federalTax = totalPay * 0.12;

    const stateTax = totalPay * 0.05;

    const socialSecurity =
      totalPay * 0.062;

    const medicare = totalPay * 0.0145;

    const totalDeductions =
      federalTax +
      stateTax +
      socialSecurity +
      medicare;

    const netPay =
      totalPay - totalDeductions;

    return {
      totalHours,
      regularHours,
      overtimeHours,
      regularPay,
      overtimePay,
      totalPay,
      hourlyRate,
      isMonthly,
      monthlySalary,
      federalTax,
      stateTax,
      socialSecurity,
      medicare,
      totalDeductions,
      netPay,
    };
  }, [employee, timeEntries]);

  const changeMonth = (
    direction: number,
  ) => {
    const newDate = new Date(currentMonth);

    newDate.setMonth(
      currentMonth.getMonth() +
        direction,
    );

    setCurrentMonth(newDate);
  };

  const handleDownload = async (
    url?: string,
  ) => {
    if (!url) return;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Error',
        'Unable to open PDF',
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator
          size="large"
          color="#2563eb"
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          My Payroll
        </Text>

        <View style={styles.monthRow}>
          <TouchableOpacity
            onPress={() =>
              changeMonth(-1)
            }>
            <ChevronLeft
              color="#111827"
              size={22}
            />
          </TouchableOpacity>

          <Text style={styles.monthText}>
            {getMonthName(currentMonth)}
          </Text>

          <TouchableOpacity
            onPress={() =>
              changeMonth(1)
            }>
            <ChevronRight
              color="#111827"
              size={22}
            />
          </TouchableOpacity>
        </View>
      </View>

      {payroll && (
        <>
          <View style={styles.card}>
            <Text style={styles.bigValue}>
              {formatCurrency(
                payroll.totalPay,
              )}
            </Text>

            <Text>Total Pay</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.bigValue}>
              {formatHours(
                payroll.totalHours,
              )}
            </Text>

            <Text>Total Hours</Text>
          </View>

          <View style={styles.card}>
            <Text
              style={styles.sectionTitle}>
              Pay History
            </Text>

            {payHistory.map((item) => (
              <View
                key={item.id}
                style={
                  styles.historyItem
                }>
                <View>
                  <Text>
                    {item.payPeriod}
                  </Text>

                  <Text>
                    Net:{' '}
                    {formatCurrency(
                      item.net,
                    )}
                  </Text>
                </View>

                {item.pdfUrl ? (
                  <TouchableOpacity
                    onPress={() =>
                      handleDownload(
                        item.pdfUrl,
                      )
                    }>
                    <Download
                      size={20}
                      color="#2563eb"
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    backgroundColor: '#fff',
    padding: 18,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
  },

  monthRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
  },

  monthText: {
    fontSize: 16,
    fontWeight: '600',
  },

  card: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 12,
  },

  bigValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },

  historyItem: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});