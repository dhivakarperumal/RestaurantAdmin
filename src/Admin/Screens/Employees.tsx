import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import colors from '../../theme/colors';
import api from '../../../api';
import AssignServerTables from './AssignServerTables';

type ApiEmployee = {
  employee_id?: string | number;
  full_name?: string;
  employee_type?: string;
  email?: string;
  phone_number?: string;
  status?: string;
  current_status?: string;
  gender?: string;
  date_of_birth?: string;
  whatsapp_number?: string;
  cuisine_type?: string;
  experience_years?: string | number;
  food_preference?: string;
  special_dishes?: string[] | string;
  description?: string;
  address?: string;
  area_locality?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  latitude?: string | number;
  longitude?: string | number;
  vehicle_type?: string;
  vehicle_number?: string;
  vehicle_model?: string;
  driving_license_number?: string;
  driving_license_expiry_date?: string;
  commission_percent?: string | number;
  working_days?: string[] | string;
  start_time?: string;
  end_time?: string;
  salary_type?: string;
  account_holder_name?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
  pan_number?: string;
  basic_salary?: string | number;
  allowances?: string | number;
  deductions?: string | number;
  net_salary?: string | number;
  payroll_notes?: string;
  available_for_delivery?: boolean | string | number;
  today_shift_state?: string;
  today_check_in?: string;
  today_check_out?: string;
};

type AssignableServer = {
  employee_id: string | number;
  full_name?: string;
};


function readResponseRows<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    return Array.isArray(payload.data) ? (payload.data as T[]) : [];
  }
  return [];
}

function readEmployeeRows(payload: unknown): ApiEmployee[] {
  const responseBody =
    typeof payload === 'object' && payload !== null && 'data' in payload
      ? payload.data
      : payload;
  if (
    typeof responseBody === 'object' &&
    responseBody !== null &&
    'employees' in responseBody
  ) {
    return Array.isArray(responseBody.employees)
      ? (responseBody.employees as ApiEmployee[])
      : [];
  }
  return readResponseRows<ApiEmployee>(payload);
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return 'Check your connection and try again.';
}

type EmployeeFormValues = Record<string, string>;

type EmployeeFormFieldDefinition = {
  name: string;
  label: string;
  required?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  multiline?: boolean;
  secureTextEntry?: boolean;
  placeholder?: string;
};

const employeeRoleOptions = [
  'Chef',
  'Delivery Partner',
  'Server',
  'Cashier',
  'Manager',
  'Cleaner',
];
const employeeWorkingDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function createEmployeeFormValues(employee?: ApiEmployee): EmployeeFormValues {
  const values: EmployeeFormValues = {
    employee_type: employee?.employee_type || 'Chef',
    status: employee?.status || 'Active',
    salary_type: employee?.salary_type || 'Monthly Basis',
    available_for_delivery:
      employee?.available_for_delivery === true ||
      employee?.available_for_delivery === 1 ||
      employee?.available_for_delivery === '1' ||
      employee?.available_for_delivery === 'Yes'
        ? 'Yes'
        : 'No',
    password: '',
    confirm_password: '',
  };
  const fields = [
    'full_name',
    'email',
    'phone_number',
    'gender',
    'date_of_birth',
    'whatsapp_number',
    'cuisine_type',
    'experience_years',
    'food_preference',
    'special_dishes',
    'address',
    'area_locality',
    'city',
    'district',
    'state',
    'pincode',
    'latitude',
    'longitude',
    'vehicle_type',
    'vehicle_number',
    'vehicle_model',
    'driving_license_number',
    'driving_license_expiry_date',
    'working_days',
    'start_time',
    'end_time',
    'commission_percent',
    'account_holder_name',
    'bank_name',
    'account_number',
    'ifsc_code',
    'upi_id',
    'pan_number',
    'basic_salary',
    'allowances',
    'deductions',
    'net_salary',
    'payroll_notes',
  ] as const;
  fields.forEach(field => {
    const value = employee?.[field];
    if (Array.isArray(value)) {
      values[field] = value.join(', ');
    } else if (value !== null && value !== undefined) {
      values[field] = String(value);
    }
  });
  values.description_about_chef = employee?.description || '';
  if (employee?.working_days) {
    const rawDays = employee.working_days;
    if (Array.isArray(rawDays)) {
      values.working_days = rawDays.join(', ');
    } else {
      try {
        const parsed: unknown = JSON.parse(rawDays);
        if (Array.isArray(parsed)) {
          values.working_days = parsed.map(String).join(', ');
        }
      } catch {
        values.working_days = rawDays;
      }
    }
  }
  if (employee?.date_of_birth) {
    values.date_of_birth = employee.date_of_birth.slice(0, 10);
  }
  if (employee?.driving_license_expiry_date) {
    values.driving_license_expiry_date =
      employee.driving_license_expiry_date.slice(0, 10);
  }
  return values;
}

function readEmployeeObject(payload: unknown): ApiEmployee | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const outer = payload as Record<string, unknown>;
  const body =
    typeof outer.data === 'object' && outer.data !== null
      ? (outer.data as Record<string, unknown>)
      : outer;
  const employee = body.employee;
  return typeof employee === 'object' && employee !== null
    ? (employee as ApiEmployee)
    : null;
}

function validateEmployeeForm(
  values: EmployeeFormValues,
  isEditing: boolean,
): string {
  const requiredFields = [
    ['full_name', 'Full name'],
    ['phone_number', 'Phone number'],
    ['email', 'Email'],
    ['address', 'Street address'],
    ['area_locality', 'Area / locality'],
    ['city', 'City'],
    ['district', 'District'],
    ['state', 'State'],
    ['pincode', 'Pincode'],
  ];
  for (const [field, label] of requiredFields) {
    if (!values[field]?.trim()) {
      return `${label} is required.`;
    }
  }
  if (!/^[6-9]\d{9}$/.test(values.phone_number.replace(/^\+91/, '').replace(/[\s\-()]/g, ''))) {
    return 'Phone number must be a 10-digit Indian mobile number.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    return 'Enter a valid email address.';
  }
  if (values.pincode && !/^\d{6}$/.test(values.pincode.trim())) {
    return 'Pincode must be 6 digits.';
  }
  if (
    values.account_number &&
    !/^\d{9,18}$/.test(values.account_number.replace(/[\s-]/g, ''))
  ) {
    return 'Bank account number must contain 9 to 18 digits.';
  }
  if (
    values.ifsc_code &&
    !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(values.ifsc_code.trim().toUpperCase())
  ) {
    return 'IFSC code must be 11 characters (for example SBIN0001234).';
  }
  if (
    values.pan_number &&
    !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(values.pan_number.trim().toUpperCase())
  ) {
    return 'PAN number must have 5 letters, 4 digits, and 1 letter.';
  }
  if (
    values.employee_type === 'Delivery Partner' &&
    values.vehicle_number &&
    !/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/.test(
      values.vehicle_number.replace(/[\s-]/g, '').toUpperCase(),
    )
  ) {
    return 'Enter a valid vehicle registration number.';
  }
  if (
    values.employee_type === 'Delivery Partner' &&
    values.driving_license_number &&
    !/^[A-Z]{2}[0-9]{2}[0-9A-Z]{7,12}$/.test(
      values.driving_license_number.replace(/[\s-]/g, '').toUpperCase(),
    )
  ) {
    return 'Enter a valid driving license number.';
  }
  if (values.employee_type === 'Chef' && !values.cuisine_type.trim()) {
    return 'Cuisine type is required for a Chef.';
  }
  if (
    values.employee_type === 'Delivery Partner' &&
    (!values.vehicle_type.trim() ||
      !values.vehicle_number.trim() ||
      !values.driving_license_number.trim())
  ) {
    return 'Vehicle type, vehicle number, and driving license are required for a Delivery Partner.';
  }
  if (
    values.employee_type === 'Delivery Partner' &&
    values.salary_type === 'Order Basis'
  ) {
    if (!values.commission_percent.trim()) {
      return 'Commission percentage is required for order-based salary.';
    }
  } else if (!values.basic_salary.trim()) {
    return 'Basic salary is required.';
  }
  if (!isEditing && !values.password.trim()) {
    return 'Password is required for a new employee.';
  }
  if (values.password || values.confirm_password) {
    if (values.password !== values.confirm_password) {
      return 'Password and confirm password do not match.';
    }
  }
  return '';
}

function EmployeesPage({ onBack }: { onBack?: () => void } = {}) {
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Working' | 'Break' | 'Off shift'>('All');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editorEmployeeId, setEditorEmployeeId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [editorDetailsLoaded, setEditorDetailsLoaded] = useState(false);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [assigningServer, setAssigningServer] = useState<AssignableServer | null>(
    null,
  );
  const [formValues, setFormValues] = useState<EmployeeFormValues>(() =>
    createEmployeeFormValues(),
  );

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const loadEmployees = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get('/employees', { signal: controller.signal });
        const rows = readEmployeeRows(response.data);
        if (isActive) {
          setEmployees(rows);
        }
      } catch (apiError) {
        if (isActive) {
          setError(getErrorMessage(apiError));
          setEmployees([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadEmployees();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [refreshKey]);

  const openAddEmployee = () => {
    setEditorEmployeeId(null);
    setFormValues(createEmployeeFormValues());
    setEditorError('');
    setIsEditorLoading(false);
    setEditorDetailsLoaded(true);
    setIsEditorOpen(true);
  };

  const openEditEmployee = async (employee: ApiEmployee) => {
    const employeeId = employee.employee_id;
    if (employeeId === undefined || employeeId === null || String(employeeId).trim() === '') {
      setError('This employee cannot be edited because the record has no employee ID.');
      return;
    }

    setEditorEmployeeId(String(employeeId));
    setFormValues(createEmployeeFormValues(employee));
    setEditorError('');
    setIsEditorLoading(true);
    setEditorDetailsLoaded(false);
    setIsEditorOpen(true);
    try {
      const response = await api.get(`/employees/${encodeURIComponent(String(employeeId))}`);
      const detail = readEmployeeObject(response.data);
      if (!detail) {
        throw new Error('The server did not return employee details.');
      }
      setFormValues(createEmployeeFormValues(detail));
      setEditorDetailsLoaded(true);
    } catch (apiError) {
      setEditorError(getErrorMessage(apiError));
    } finally {
      setIsEditorLoading(false);
    }
  };

  const saveEmployee = async () => {
    setEditorError('');
    const validationError = validateEmployeeForm(formValues, Boolean(editorEmployeeId));
    if (validationError) {
      setEditorError(validationError);
      return;
    }

    const payload = new FormData();
    Object.entries(formValues).forEach(([field, value]) => {
      if (
        formValues.employee_type !== 'Delivery Partner' &&
        ['salary_type', 'available_for_delivery'].includes(field)
      ) {
        return;
      }
      if (
        formValues.employee_type !== 'Chef' &&
        ['special_dishes', 'description_about_chef', 'cuisine_type', 'food_preference', 'experience_years'].includes(field)
      ) {
        return;
      }
      if (
        formValues.employee_type !== 'Delivery Partner' &&
        ['vehicle_type', 'vehicle_number', 'vehicle_model', 'driving_license_number', 'driving_license_expiry_date', 'working_days', 'start_time', 'end_time', 'commission_percent'].includes(field)
      ) {
        return;
      }
      if (field === 'password' && editorEmployeeId && !value.trim()) {
        return;
      }
      if (field === 'special_dishes' || field === 'working_days') {
        value
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)
          .forEach(item => payload.append(field, item));
        return;
      }
      payload.append(field, value);
    });

    setIsSavingEmployee(true);
    try {
      if (editorEmployeeId) {
        await api.put(`/employees/${encodeURIComponent(editorEmployeeId)}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/employees', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setIsEditorOpen(false);
      setRefreshKey(current => current + 1);
    } catch (apiError) {
      const responseData =
        typeof apiError === 'object' && apiError !== null && 'data' in apiError
          ? apiError.data
          : undefined;
      const responseMessage =
        typeof responseData === 'object' &&
        responseData !== null &&
        'message' in responseData &&
        typeof responseData.message === 'string'
          ? responseData.message
          : getErrorMessage(apiError);
      setEditorError(responseMessage);
    } finally {
      setIsSavingEmployee(false);
    }
  };

  const updateFormValue = (field: string, value: string) => {
    setFormValues(current => ({ ...current, [field]: value }));
  };

  const personalFields: EmployeeFormFieldDefinition[] = [
    { name: 'full_name', label: 'Full name', required: true },
    { name: 'phone_number', label: 'Phone number', required: true, keyboardType: 'phone-pad' },
    { name: 'email', label: 'Email', required: true, keyboardType: 'email-address' },
    { name: 'date_of_birth', label: 'Date of birth', placeholder: 'YYYY-MM-DD' },
    ...(formValues.employee_type === 'Delivery Partner'
      ? [{ name: 'whatsapp_number', label: 'WhatsApp number', keyboardType: 'phone-pad' as const }]
      : []),
  ];
  const locationFields: EmployeeFormFieldDefinition[] = [
    { name: 'address', label: 'Street address', required: true, multiline: true },
    { name: 'area_locality', label: 'Area / locality', required: true },
    { name: 'city', label: 'City', required: true },
    { name: 'district', label: 'District', required: true },
    { name: 'state', label: 'State', required: true },
    { name: 'pincode', label: 'Pincode', required: true, keyboardType: 'numeric' },
  ];
  const bankFields: EmployeeFormFieldDefinition[] = [
    { name: 'account_holder_name', label: 'Account holder name' },
    { name: 'bank_name', label: 'Bank name' },
    { name: 'account_number', label: 'Account number', keyboardType: 'numeric' },
    { name: 'ifsc_code', label: 'IFSC code' },
    { name: 'upi_id', label: 'UPI ID' },
    { name: 'pan_number', label: 'PAN number' },
  ];
  const salaryFields: EmployeeFormFieldDefinition[] = [
    { name: 'basic_salary', label: 'Basic salary', required: true, keyboardType: 'numeric' },
    { name: 'allowances', label: 'Allowances', keyboardType: 'numeric' },
    { name: 'deductions', label: 'Deductions', keyboardType: 'numeric' },
    { name: 'net_salary', label: 'Net salary', keyboardType: 'numeric' },
    { name: 'payroll_notes', label: 'Payroll notes', multiline: true },
  ];
  const roleFields: EmployeeFormFieldDefinition[] =
    formValues.employee_type === 'Chef'
      ? [
          { name: 'experience_years', label: 'Experience (years)', keyboardType: 'numeric' },
          { name: 'special_dishes', label: 'Special dishes', placeholder: 'Separate dishes with commas' },
          { name: 'description_about_chef', label: 'About the chef', multiline: true },
        ]
      : formValues.employee_type === 'Delivery Partner'
        ? [
            { name: 'vehicle_number', label: 'Vehicle number', required: true },
            { name: 'vehicle_model', label: 'Vehicle model' },
            { name: 'driving_license_number', label: 'Driving license number', required: true },
            { name: 'driving_license_expiry_date', label: 'License expiry date', placeholder: 'YYYY-MM-DD' },
            { name: 'commission_percent', label: 'Commission %', keyboardType: 'numeric' },
            { name: 'start_time', label: 'Shift start time', placeholder: 'HH:MM' },
            { name: 'end_time', label: 'Shift end time', placeholder: 'HH:MM' },
          ]
        : [];

  const normalizeEmployeeStatus = (employee: ApiEmployee) => {
    const status = String(employee.current_status || employee.status || '').trim();
    if (status && !['Active', 'Inactive'].includes(status)) {
      return status;
    }
    return employee.status || 'Active';
  };

  const filteredEmployees = employees.filter(employee => {
    const searchValue = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      String(employee.full_name || '').toLowerCase().includes(searchValue) ||
      String(employee.employee_type || '').toLowerCase().includes(searchValue) ||
      String(employee.email || '').toLowerCase().includes(searchValue) ||
      String(employee.phone_number || '').toLowerCase().includes(searchValue);

    const matchesStatus =
      statusFilter === 'All' ||
      normalizeEmployeeStatus(employee).toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <ScrollView contentContainerClassName="mx-auto w-full max-w-[1100px] px-5 pb-7 pt-6">
      <Text className="text-[10px] font-bold tracking-[1.2px] text-[#6B7280]">TEAM</Text>
      <Text className="mt-[5px] text-2xl font-bold text-[#012711]">Employees</Text>
      <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">Manage your restaurant staff and daily coverage.</Text>

      <View className="mt-7 rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <View className="flex-row flex-wrap items-center gap-2.5">
          <View className="min-w-[180px] flex-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
            <Text className="text-[11px] font-semibold text-[#6B7280]">Search employee</Text>
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Name, role, email"
              placeholderTextColor={colors.textSecondary}
              className="mt-1 text-[13px] text-[#012711]"
            />
          </View>
          <View className="min-w-[140px] rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
            <Text className="text-[11px] font-semibold text-[#6B7280]">Status</Text>
            <TextInput
              value={statusFilter}
              editable={false}
              className="mt-1 text-[13px] text-[#012711]"
            />
          </View>
          <Pressable
            accessibilityLabel="Add new employee"
            accessibilityRole="button"
            onPress={openAddEmployee}
            className="rounded-xl bg-[#116C0B] px-3 py-3"
          >
            <Text className="text-[12px] font-semibold text-white">+ Add employee</Text>
          </Pressable>
        </View>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {(['All', 'Active', 'Inactive', 'Working'] as const).map(filter => (
            <Pressable
              accessibilityRole="button"
              key={filter}
              onPress={() => setStatusFilter(filter)}
              className={`rounded-full border px-3 py-1.5 ${
                statusFilter === filter
                  ? 'border-[#116C0B] bg-[#116C0B]'
                  : 'border-[#E5E7EB] bg-[#F9FAFB]'
              }`}
            >
              <Text
                className={`text-[11px] font-semibold ${
                  statusFilter === filter ? 'text-white' : 'text-[#6B7280]'
                }`}
              >
                {filter}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? (
        <View className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4">
          <Text className="text-[13px] font-medium text-[#991B1B]">{error}</Text>
        </View>
      ) : null}

      <View className="mb-3 mt-7 flex-row items-center justify-between">
        <Text className="text-base font-bold text-[#012711]">Team roster</Text>
        <Text className="text-[11px] text-[#6B7280]">{filteredEmployees.length} employees</Text>
      </View>

      {isLoading && !employees.length ? (
        <View className="min-h-[120px] items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-6">
          <ActivityIndicator color={colors.primary} />
          <Text className="text-[13px] text-[#6B7280]">Loading employees…</Text>
        </View>
      ) : filteredEmployees.length ? (
        <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3">
          {filteredEmployees.map(employee => {
            const employeeStatus = normalizeEmployeeStatus(employee);
            const statusClass =
              employeeStatus.toLowerCase() === 'working' || employeeStatus.toLowerCase() === 'on duty' || employeeStatus.toLowerCase() === 'available'
                ? 'bg-[#DCFCE7] text-[#166534]'
                : employeeStatus.toLowerCase() === 'break'
                  ? 'bg-[#F0F7EE] text-[#116C0B]'
                  : 'bg-[#F3F4F6] text-[#4B5563]';
            const initials = String(employee.full_name || 'E')
              .split(' ')
              .map(part => part[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();
            const employeeId = employee.employee_id;

            return (
              <View
                key={String(employee.employee_id || employee.full_name || initials)}
                className="flex-row items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3"
              >
                <View className="h-12 w-12 items-center justify-center rounded-full bg-[#E0F2FE]">
                  <Text className="text-sm font-bold text-[#0F172A]">{initials}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-[#012711]">{employee.full_name || 'Employee'}</Text>
                  <Text className="mt-[2px] text-[11px] leading-4 text-[#6B7280]">
                    {employee.employee_type || 'Staff'} • {employee.current_status || employee.status || 'Active'}
                  </Text>
                  <Text className="mt-[2px] text-[11px] leading-4 text-[#6B7280]">{employee.email || employee.phone_number || 'No contact added'}</Text>
                </View>
                <View className="items-end">
                  <Text className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass}`}>
                    {employeeStatus}
                  </Text>
                  <Text className="mt-2 text-[10px] font-medium text-[#6B7280]">
                    {employee.today_shift_state || employee.status || 'Active'}
                  </Text>
                  <Pressable
                    accessibilityLabel={`Edit employee ${employee.full_name || 'record'}`}
                    accessibilityRole="button"
                    onPress={() => openEditEmployee(employee)}
                    className="mt-2 rounded-lg border border-[#D1D5DB] bg-white px-2.5 py-1.5"
                  >
                    <Text className="text-[11px] font-semibold text-[#116C0B]">Edit</Text>
                  </Pressable>
                  {employee.employee_type === 'Server' &&
                  employeeId !== undefined &&
                  employeeId !== null ? (
                    <Pressable
                      accessibilityLabel={`Assign tables to ${employee.full_name || 'server'}`}
                      accessibilityRole="button"
                      onPress={() =>
                        setAssigningServer({
                          employee_id: employeeId,
                          full_name: employee.full_name,
                        })
                      }
                      className="mt-2 rounded-lg bg-[#1F3228] px-2.5 py-1.5"
                    >
                      <Text className="text-[11px] font-semibold text-white">
                        Assign tables
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View className="mt-1 rounded-2xl border border-[#E5E7EB] bg-white p-6">
          <Text className="text-[13px] text-[#6B7280]">
            No employees match your current filter.
          </Text>
        </View>
      )}

      <View className="mt-7 rounded-2xl border border-[#E5E7EB] bg-white p-[18px]">
        <Text className="text-base font-bold text-[#012711]">Contact directory</Text>
        <View className="mt-4 gap-3">
          {employees.slice(0, 4).map(employee => (
            <View key={`${employee.employee_id || employee.full_name}-contact`} className="flex-row items-center justify-between border-b border-[#E5E7EB] pb-2.5">
              <View>
                <Text className="text-sm font-semibold text-[#012711]">{employee.full_name || 'Employee'}</Text>
                <Text className="text-[11px] text-[#6B7280]">{employee.employee_type || 'Staff'}</Text>
              </View>
              <Text className="text-[11px] text-[#6B7280]">{employee.phone_number || employee.email || '—'}</Text>
            </View>
          ))}
        </View>
      </View>

      {onBack ? (
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          className="mt-5 items-center py-3.5"
        >
          <Text className="text-sm font-semibold text-[#116C0B]">Back to More</Text>
        </Pressable>
      ) : null}
      <Modal
        animationType="slide"
        onRequestClose={() => setIsEditorOpen(false)}
        transparent
        visible={isEditorOpen}
      >
        <View className="flex-1 justify-end bg-[#11182799]">
          <SafeAreaView edges={['bottom']} className="max-h-[94%] rounded-t-3xl bg-[#F9FAFB]">
            <View className="flex-row items-center justify-between border-b border-[#E5E7EB] bg-white px-5 py-4">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-bold text-[#012711]">
                  {editorEmployeeId ? 'Edit employee' : 'Add new employee'}
                </Text>
                <Text className="mt-1 text-xs text-[#6B7280]">
                  {editorEmployeeId
                    ? `Update ${formValues.full_name || 'employee'} details`
                    : 'Create a staff profile with login and payroll details'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close employee form"
                accessibilityRole="button"
                disabled={isSavingEmployee}
                onPress={() => setIsEditorOpen(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6]"
              >
                <Text className="text-2xl leading-7 text-[#6B7280]">×</Text>
              </Pressable>
            </View>
            {isEditorLoading ? (
              <View className="min-h-[220px] items-center justify-center gap-3">
                <ActivityIndicator color={colors.primary} />
                <Text className="text-sm text-[#6B7280]">Loading employee details…</Text>
              </View>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerClassName="gap-4 px-4 py-4"
              >
                {!editorEmployeeId ? (
                  <View className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                    <Text className="mb-3 text-sm font-bold text-[#012711]">Select employee role</Text>
                    <EmployeeChoiceField
                      accessibilityLabel="Employee role"
                      multiple={false}
                      onChange={value => updateFormValue('employee_type', value)}
                      options={employeeRoleOptions}
                      value={formValues.employee_type}
                    />
                  </View>
                ) : null}

                <EmployeeFormSection title="Personal & access details">
                  <EmployeeChoiceField
                    label="Gender"
                    multiple={false}
                    onChange={value => updateFormValue('gender', value)}
                    options={['Female', 'Male', 'Non-binary', 'Prefer not to say']}
                    value={formValues.gender || ''}
                  />
                  {personalFields.map(field => (
                    <EmployeeFormField
                      key={field.name}
                      {...field}
                      onChangeText={value => updateFormValue(field.name, value)}
                      value={formValues[field.name] || ''}
                    />
                  ))}
                  <EmployeeChoiceField
                    accessibilityLabel="Employee status"
                    label="Status"
                    multiple={false}
                    onChange={value => updateFormValue('status', value)}
                    options={['Active', 'Inactive']}
                    value={formValues.status}
                  />
                  {editorEmployeeId ? (
                    <Text className="text-xs leading-5 text-[#6B7280]">
                      Leave both password fields blank to keep the current password.
                    </Text>
                  ) : null}
                  <EmployeeFormField
                    label={editorEmployeeId ? 'New password (optional)' : 'Password'}
                    name="password"
                    onChangeText={value => updateFormValue('password', value)}
                    required={!editorEmployeeId}
                    secureTextEntry
                    value={formValues.password}
                  />
                  <EmployeeFormField
                    label="Confirm password"
                    name="confirm_password"
                    onChangeText={value => updateFormValue('confirm_password', value)}
                    required={!editorEmployeeId}
                    secureTextEntry
                    value={formValues.confirm_password}
                  />
                </EmployeeFormSection>

                {formValues.employee_type === 'Chef' ? (
                  <EmployeeFormSection title="Culinary details">
                    <EmployeeChoiceField
                      label="Cuisine type"
                      multiple={false}
                      onChange={value => updateFormValue('cuisine_type', value)}
                      options={['South Indian', 'North Indian', 'Chinese', 'Bakery', 'Italian', 'Continental', 'Other']}
                      value={formValues.cuisine_type || ''}
                    />
                    <EmployeeChoiceField
                      label="Food preference"
                      multiple={false}
                      onChange={value => updateFormValue('food_preference', value)}
                      options={['Veg', 'Non-Veg', 'Both']}
                      value={formValues.food_preference || ''}
                    />
                    {roleFields.map(field => (
                      <EmployeeFormField
                        key={field.name}
                        {...field}
                        onChangeText={value => updateFormValue(field.name, value)}
                        value={formValues[field.name] || ''}
                      />
                    ))}
                  </EmployeeFormSection>
                ) : null}

                {formValues.employee_type === 'Delivery Partner' ? (
                  <EmployeeFormSection title="Vehicle & schedule">
                    <EmployeeChoiceField
                      label="Vehicle type"
                      multiple={false}
                      onChange={value => updateFormValue('vehicle_type', value)}
                      options={['Bike', 'Scooter', 'Bicycle', 'Electric Vehicle']}
                      value={formValues.vehicle_type || ''}
                    />
                    {roleFields.map(field => (
                      <EmployeeFormField
                        key={field.name}
                        {...field}
                        onChangeText={value => updateFormValue(field.name, value)}
                        value={formValues[field.name] || ''}
                      />
                    ))}
                    <EmployeeChoiceField
                      label="Working days"
                      multiple
                      onChange={value => updateFormValue('working_days', value)}
                      options={employeeWorkingDays}
                      value={formValues.working_days || ''}
                    />
                    <EmployeeChoiceField
                      label="Available for delivery"
                      multiple={false}
                      onChange={value => updateFormValue('available_for_delivery', value)}
                      options={['Yes', 'No']}
                      value={formValues.available_for_delivery}
                    />
                    <EmployeeChoiceField
                      label="Salary structure"
                      multiple={false}
                      onChange={value => updateFormValue('salary_type', value)}
                      options={['Monthly Basis', 'Order Basis']}
                      value={formValues.salary_type}
                    />
                    {formValues.salary_type === 'Order Basis' ? (
                      <EmployeeFormField
                        keyboardType="numeric"
                        label="Commission %"
                        name="commission_percent"
                        onChangeText={value => updateFormValue('commission_percent', value)}
                        value={formValues.commission_percent || ''}
                      />
                    ) : null}
                  </EmployeeFormSection>
                ) : null}

                <EmployeeFormSection title="Location & address">
                  {locationFields.map(field => (
                    <EmployeeFormField
                      key={field.name}
                      {...field}
                      onChangeText={value => updateFormValue(field.name, value)}
                      value={formValues[field.name] || ''}
                    />
                  ))}
                  {(formValues.employee_type === 'Chef' ||
                    formValues.employee_type === 'Delivery Partner') ? (
                    <>
                      <EmployeeFormField
                        label="Latitude"
                        name="latitude"
                        onChangeText={value => updateFormValue('latitude', value)}
                        value={formValues.latitude || ''}
                      />
                      <EmployeeFormField
                        label="Longitude"
                        name="longitude"
                        onChangeText={value => updateFormValue('longitude', value)}
                        value={formValues.longitude || ''}
                      />
                    </>
                  ) : null}
                </EmployeeFormSection>

                <EmployeeFormSection title="Bank & payment details">
                  {bankFields.map(field => (
                    <EmployeeFormField
                      key={field.name}
                      {...field}
                      onChangeText={value => updateFormValue(field.name, value)}
                      value={formValues[field.name] || ''}
                    />
                  ))}
                </EmployeeFormSection>

                {formValues.employee_type !== 'Delivery Partner' ||
                formValues.salary_type === 'Monthly Basis' ? (
                  <EmployeeFormSection title="Compensation & payroll">
                    {salaryFields.map(field => (
                      <EmployeeFormField
                        key={field.name}
                        {...field}
                        onChangeText={value => updateFormValue(field.name, value)}
                        value={formValues[field.name] || ''}
                      />
                    ))}
                  </EmployeeFormSection>
                ) : null}

                {editorError ? (
                  <View className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
                    <Text accessibilityRole="alert" className="text-sm leading-5 text-[#991B1B]">
                      {editorError}
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  accessibilityLabel={editorEmployeeId ? 'Save employee changes' : 'Create employee'}
                  accessibilityRole="button"
                  disabled={
                    isSavingEmployee ||
                    isEditorLoading ||
                    (Boolean(editorEmployeeId) && !editorDetailsLoaded)
                  }
                  onPress={saveEmployee}
                  className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl bg-[#116C0B] px-4 py-3"
                  style={({ pressed }) => ({
                    opacity: isSavingEmployee ? 0.6 : pressed ? 0.85 : 1,
                  })}
                >
                  {isSavingEmployee ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                  <Text className="text-sm font-bold text-white">
                    {isSavingEmployee
                      ? 'Saving…'
                      : editorEmployeeId
                        ? 'Save changes'
                        : 'Create employee'}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={isSavingEmployee}
                  onPress={() => setIsEditorOpen(false)}
                  className="items-center py-2"
                >
                  <Text className="text-sm font-semibold text-[#6B7280]">Cancel</Text>
                </Pressable>
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>
      <AssignServerTables
        server={assigningServer}
        onClose={() => setAssigningServer(null)}
        onSaved={() => setAssigningServer(null)}
      />
    </ScrollView>
  );
}

function EmployeeFormSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <Text className="text-sm font-bold text-[#012711]">{title}</Text>
      {children}
    </View>
  );
}

function EmployeeFormField({
  keyboardType = 'default',
  label,
  multiline = false,
  name,
  onChangeText,
  placeholder,
  required = false,
  secureTextEntry = false,
  value,
}: EmployeeFormFieldDefinition & {
  value: string;
  onChangeText: (value: string) => void;
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isSecure = secureTextEntry && !isPasswordVisible;
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold text-[#374151]">
        {label}{required ? ' *' : ''}
      </Text>
      <View className="flex-row items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] pr-2">
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
          keyboardType={keyboardType}
          multiline={multiline}
          onChangeText={onChangeText}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={isSecure}
          textAlignVertical={multiline ? 'top' : 'center'}
          value={value}
          className={`min-w-0 flex-1 px-3.5 text-sm text-[#012711] ${
            multiline ? 'min-h-[88px] py-3' : 'min-h-11 py-2'
          }`}
          nativeID={`employee-${name}`}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityLabel={`${isPasswordVisible ? 'Hide' : 'Show'} ${name === 'confirm_password' ? 'confirm password' : 'password'}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isPasswordVisible }}
            onPress={() => setIsPasswordVisible(visible => !visible)}
            className="h-10 w-10 items-center justify-center rounded-lg"
            hitSlop={6}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"
                stroke={colors.textSecondary}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z"
                stroke={colors.textSecondary}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {!isPasswordVisible ? (
                <Path
                  d="m4 20 16-16"
                  stroke={colors.textSecondary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              ) : null}
            </Svg>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function EmployeeChoiceField({
  accessibilityLabel,
  label,
  multiple,
  onChange,
  options,
  value,
}: {
  accessibilityLabel?: string;
  label?: string;
  multiple: boolean;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  const selectedValues = value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  return (
    <View className="gap-2">
      {label ? (
        <Text className="text-xs font-semibold text-[#374151]">{label}</Text>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        {options.map(option => {
          const selected = selectedValues.includes(option);
          return (
            <Pressable
              accessibilityLabel={
                accessibilityLabel
                  ? `${accessibilityLabel}: ${option}`
                  : `${label || 'Option'}: ${option}`
              }
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option}
              onPress={() => {
                if (multiple) {
                  const next = selected
                    ? selectedValues.filter(item => item !== option)
                    : [...selectedValues, option];
                  onChange(next.join(', '));
                } else {
                  onChange(option);
                }
              }}
              className={`rounded-full border px-3 py-2 ${
                selected
                  ? 'border-[#116C0B] bg-[#F0F7EE]'
                  : 'border-[#E5E7EB] bg-white'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selected ? 'text-[#116C0B]' : 'text-[#6B7280]'
                }`}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}



export default EmployeesPage;
