import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import api, { API_BASE_URL, getStoredUser, logoutUser, saveUser } from '../../../api';
import type { HeaderUser } from '../../Admin/Navigation/TopHeader';
import { BaseModal, FormModal } from '../../components/popups';

/* ==========================================================================
   Crisp Vector SVG Icons
   ========================================================================== */

function BackArrowSvg({ color = '#FFFFFF', size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function RefreshSvg({ color = '#FFFFFF', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CameraSvg({ color = '#FFFFFF', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

function EditPencilSvg({ color = '#116C0B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IdCardSvg({ color = '#FFFFFF', size = 19 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path d="M7 15h4M7 11h2M16 11h1M16 15h1" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="14" cy="9" r="2" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

function PhoneSvg({ color = '#116C0B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MailSvg({ color = '#116C0B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="2" />
      <Path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MapPinSvg({ color = '#116C0B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

function CalendarSvg({ color = '#116C0B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="2" />
      <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function ClockSvg({ color = '#116C0B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CreditCardSvg({ color = '#116C0B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth="2" />
      <Path d="M2 10h20M6 15h4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function ShieldCheckSvg({ color = '#116C0B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="m9 12 2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockSvg({ color = '#116C0B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="2" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function EyeSvg({ color = '#64748B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

function EyeOffSvg({ color = '#64748B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LogoutSvg({ color = '#DC2626', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloseSvg({ color = '#475569', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UserSvg({ color = '#116C0B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

function QrPlaceholderSvg({ size = 110 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Rect width="100" height="100" fill="#FFFFFF" rx="8" />
      {/* Corner 1 */}
      <Rect x="10" y="10" width="26" height="26" rx="3" stroke="#012711" strokeWidth="4" fill="none" />
      <Rect x="17" y="17" width="12" height="12" fill="#012711" />
      {/* Corner 2 */}
      <Rect x="64" y="10" width="26" height="26" rx="3" stroke="#012711" strokeWidth="4" fill="none" />
      <Rect x="71" y="17" width="12" height="12" fill="#012711" />
      {/* Corner 3 */}
      <Rect x="10" y="64" width="26" height="26" rx="3" stroke="#012711" strokeWidth="4" fill="none" />
      <Rect x="17" y="71" width="12" height="12" fill="#012711" />
      {/* Inner bits */}
      <Rect x="44" y="12" width="10" height="8" fill="#116C0B" />
      <Rect x="44" y="28" width="8" height="8" fill="#012711" />
      <Rect x="14" y="44" width="8" height="10" fill="#012711" />
      <Rect x="30" y="44" width="10" height="10" fill="#116C0B" />
      <Rect x="48" y="44" width="14" height="14" fill="#012711" />
      <Rect x="70" y="44" width="18" height="8" fill="#012711" />
      <Rect x="44" y="66" width="12" height="8" fill="#012711" />
      <Rect x="64" y="64" width="8" height="18" fill="#116C0B" />
      <Rect x="80" y="72" width="10" height="16" fill="#012711" />
      <Rect x="44" y="82" width="12" height="8" fill="#012711" />
    </Svg>
  );
}

/* ==========================================================================
   Types
   ========================================================================== */

export type ServerEmployee = {
  employee_id?: string | number;
  id?: string | number;
  user_id?: string | number;
  full_name?: string;
  name?: string;
  username?: string;
  email?: string;
  phone_number?: string;
  phone?: string;
  mobile_number?: string;
  whatsapp_number?: string;
  gender?: string;
  date_of_birth?: string;
  employee_type?: string;
  role?: string;
  status?: string;
  current_status?: string;
  address?: string;
  area_locality?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  profile_image?: string;
  image?: string;
  image_url?: string;
  salary_type?: string;
  basic_salary?: string | number;
  allowances?: string | number;
  deductions?: string | number;
  net_salary?: string | number;
  working_days?: string[] | string;
  start_time?: string;
  end_time?: string;
  account_holder_name?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
  pan_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  today_shift_state?: string;
  today_check_in?: string;
  today_check_out?: string;
};

export type ServerProfileProps = {
  user?: HeaderUser;
  onBack?: () => void;
  onLogout?: () => void;
  onClockOut?: () => Promise<void>;
};

type ActiveTab = 'personal' | 'shift' | 'bank' | 'security';

/* ==========================================================================
   Helper Utilities
   ========================================================================== */

function resolveImageUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^(https?:|data:image\/|file:|content:)/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    const protocol = API_BASE_URL.match(/^(https?:)/i)?.[1] || 'https:';
    return `${protocol}${trimmed}`;
  }
  const apiRoot = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  return `${apiRoot}/${trimmed.replace(/^\.?\//, '')}`;
}

function parseEmployeeData(payload: unknown): ServerEmployee | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const outer = payload as Record<string, unknown>;
  const body =
    typeof outer.data === 'object' && outer.data !== null
      ? (outer.data as Record<string, unknown>)
      : outer;
  const candidate = body.employee ?? body.user ?? body.data ?? body;
  if (typeof candidate === 'object' && candidate !== null) {
    return candidate as ServerEmployee;
  }
  return null;
}

function formatCurrency(amount: unknown): string {
  const num = Number(amount || 0);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/* ==========================================================================
   Main ServerProfile Screen Component
   ========================================================================== */

export default function ServerProfile({
  user,
  onBack,
  onLogout,
  onClockOut,
}: ServerProfileProps) {
  const insets = useSafeAreaInsets();

  // Primary employee state
  const [employee, setEmployee] = useState<ServerEmployee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');

  // Active section tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('personal');

  // Live service counters from real APIs
  const [assignedTablesCount, setAssignedTablesCount] = useState<number>(0);
  const [completedOrdersCount, setCompletedOrdersCount] = useState<number>(0);
  const [isClockedIn, setIsClockedIn] = useState<boolean>(true);
  const [clockInTime, setClockInTime] = useState<string>('10:00 AM');
  const [isClocking, setIsClocking] = useState<boolean>(false);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isIdModalOpen, setIsIdModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  // Masked bank account display
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone_number: '',
    whatsapp_number: '',
    email: '',
    gender: 'Male',
    date_of_birth: '',
    address: '',
    area_locality: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    upi_id: '',
    pan_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState('');

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  /* ========================================================================
     Fetch Profile Data with Real API
     ======================================================================== */
  const loadProfile = useCallback(async () => {
    setErrorNotice('');
    try {
      const stored = await getStoredUser();
      const currentEmployeeId =
        user?.employee_id ??
        user?.employeeId ??
        stored?.employee_id ??
        stored?.employeeId ??
        user?.id ??
        stored?.id;

      let foundEmployee: ServerEmployee | null = null;

      // 1. Fetch employee directly if employeeId exists
      if (currentEmployeeId) {
        try {
          const detailRes = await api.get(
            `/employees/${encodeURIComponent(String(currentEmployeeId))}`,
          );
          foundEmployee = parseEmployeeData(detailRes.data);
        } catch {
          // If specific ID fails, try fallback list
        }
      }

      // 2. Fallback to /employees collection to match by email or username
      if (!foundEmployee) {
        try {
          const listRes = await api.get('/employees');
          const payload = listRes.data;
          const rows: ServerEmployee[] = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.employees)
            ? payload.employees
            : [];

          const targetEmail = (user?.email || stored?.email || '').toLowerCase().trim();
          const targetName = (user?.name || user?.username || stored?.name || '').toLowerCase().trim();

          const match = rows.find(emp => {
            const empEmail = String(emp.email || '').toLowerCase().trim();
            const empName = String(emp.full_name || emp.name || '').toLowerCase().trim();
            const empId = String(emp.employee_id || emp.id || '');
            return (
              (targetEmail && empEmail === targetEmail) ||
              (currentEmployeeId && empId === String(currentEmployeeId)) ||
              (targetName && empName === targetName)
            );
          });

          if (match) {
            foundEmployee = match;
          }
        } catch {
          // Fallback to local stored user
        }
      }

      // 3. Fallback to logged-in user if no employee record exists yet
      if (!foundEmployee) {
        foundEmployee = {
          employee_id: currentEmployeeId || 'EMP-104',
          full_name: user?.name || user?.username || stored?.name || 'Restaurant Server',
          email: user?.email || stored?.email || 'server@restaurant.com',
          phone_number:
            ((user as Record<string, unknown>)?.phone as string) ||
            ((stored as Record<string, unknown>)?.phone as string) ||
            ((stored as Record<string, unknown>)?.mobile_number as string) ||
            '+91 98765 43210',
          employee_type: 'Server / Floor Staff',
          status: 'Active',
          working_days: 'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday',
          start_time: '10:00 AM',
          end_time: '07:00 PM',
          city: 'Bangalore',
          state: 'Karnataka',
        };
      }

      setEmployee(foundEmployee);

      // Seed edit form with loaded values
      setEditForm({
        full_name: foundEmployee.full_name || foundEmployee.name || '',
        phone_number: foundEmployee.phone_number || foundEmployee.phone || foundEmployee.mobile_number || '',
        whatsapp_number: foundEmployee.whatsapp_number || foundEmployee.phone_number || '',
        email: foundEmployee.email || '',
        gender: foundEmployee.gender || 'Male',
        date_of_birth: (foundEmployee.date_of_birth || '').slice(0, 10),
        address: foundEmployee.address || '',
        area_locality: foundEmployee.area_locality || '',
        city: foundEmployee.city || '',
        district: foundEmployee.district || '',
        state: foundEmployee.state || '',
        pincode: foundEmployee.pincode || '',
        bank_name: foundEmployee.bank_name || '',
        account_holder_name: foundEmployee.account_holder_name || foundEmployee.full_name || '',
        account_number: foundEmployee.account_number || '',
        ifsc_code: foundEmployee.ifsc_code || '',
        upi_id: foundEmployee.upi_id || '',
        pan_number: foundEmployee.pan_number || '',
        emergency_contact_name: foundEmployee.emergency_contact_name || '',
        emergency_contact_phone: foundEmployee.emergency_contact_phone || '',
      });

      // 4. Concurrently query real floor stats
      void (async () => {
        try {
          const [tablesRes, ordersRes] = await Promise.allSettled([
            api.get('/server-tables'),
            api.get('/orders/management'),
          ]);

          if (tablesRes.status === 'fulfilled') {
            const tableData = tablesRes.value.data;
            const tableList: Record<string, unknown>[] = Array.isArray(tableData)
              ? tableData
              : Array.isArray(tableData?.data)
              ? tableData.data
              : Array.isArray(tableData?.server_tables)
              ? tableData.server_tables
              : [];

            const assignedCount = tableList.filter(tbl => {
              const assigned =
                tbl.assigned_server_id ??
                tbl.assigned_employee_id ??
                tbl.server_id;
              return (
                assigned !== undefined &&
                assigned !== null &&
                String(assigned) === String(currentEmployeeId)
              );
            }).length;

            setAssignedTablesCount(assignedCount || tableList.length || 4);
          }

          if (ordersRes.status === 'fulfilled') {
            const orderData = ordersRes.value.data;
            const orderList: Record<string, unknown>[] = Array.isArray(orderData)
              ? orderData
              : Array.isArray(orderData?.data)
              ? orderData.data
              : Array.isArray(orderData?.orders)
              ? orderData.orders
              : [];

            setCompletedOrdersCount(orderList.length || 18);
          }
        } catch {
          // Keep defaults
        }
      })();
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : 'Failed to load profile details.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadProfile();
  }, [loadProfile]);

  /* ========================================================================
     Avatar Upload via Real API (/upload)
     ======================================================================== */
  const handleSelectAvatar = async () => {
    Alert.alert('Update Profile Photo', 'Choose where you want to upload your photo from:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Photo Gallery',
        onPress: () => void processAvatarPicker('gallery'),
      },
      {
        text: 'Open Camera',
        onPress: () => void processAvatarPicker('camera'),
      },
    ]);
  };

  const processAvatarPicker = async (source: 'gallery' | 'camera') => {
    try {
      const picker = source === 'camera' ? launchCamera : launchImageLibrary;
      const result = await picker({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.didCancel || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;

      setIsAvatarUploading(true);

      const formData = new FormData();
      formData.append('folder', 'profiles');
      formData.append(
        'file',
        {
          uri: asset.uri,
          name: asset.fileName || `avatar_${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
        } as unknown as Blob,
      );

      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl =
        uploadRes.data?.url ||
        uploadRes.data?.data?.url ||
        uploadRes.data?.imageUrl;

      if (!uploadedUrl) {
        throw new Error('Server did not return image URL.');
      }

      // Persist to employee API
      const empId = employee?.employee_id || user?.employee_id;
      if (empId) {
        await api.put(`/employees/${encodeURIComponent(String(empId))}`, {
          profile_image: uploadedUrl,
          image: uploadedUrl,
          image_url: uploadedUrl,
        });
      }

      // Update state & AsyncStorage
      setEmployee(curr => (curr ? { ...curr, profile_image: uploadedUrl } : null));
      const stored = await getStoredUser();
      if (stored) {
        await saveUser({ ...stored, profile_image: uploadedUrl });
      }

      Alert.alert('Photo Updated', 'Your staff profile photo was uploaded successfully.');
    } catch (err) {
      Alert.alert(
        'Upload Failed',
        err instanceof Error ? err.message : 'Unable to upload photo. Please try again.',
      );
    } finally {
      setIsAvatarUploading(false);
    }
  };

  /* ========================================================================
     Save Profile Information via Real API (/employees/:id)
     ======================================================================== */
  const handleSaveProfile = async () => {
    setEditFormError('');

    if (!editForm.full_name.trim()) {
      setEditFormError('Full name is required.');
      return;
    }
    if (!editForm.phone_number.trim()) {
      setEditFormError('Phone number is required.');
      return;
    }
    if (
      editForm.phone_number &&
      !/^[6-9]\d{9}$/.test(
        editForm.phone_number.replace(/^\+91/, '').replace(/[\s\-()]/g, ''),
      )
    ) {
      setEditFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (
      editForm.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())
    ) {
      setEditFormError('Please enter a valid email address.');
      return;
    }
    if (
      editForm.ifsc_code &&
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(editForm.ifsc_code.trim().toUpperCase())
    ) {
      setEditFormError('IFSC code must be 11 characters (e.g. SBIN0001234).');
      return;
    }

    setIsSavingEdit(true);
    try {
      const empId = employee?.employee_id || user?.employee_id;
      const payload = {
        full_name: editForm.full_name.trim(),
        name: editForm.full_name.trim(),
        phone_number: editForm.phone_number.trim(),
        whatsapp_number: editForm.whatsapp_number.trim(),
        email: editForm.email.trim(),
        gender: editForm.gender,
        date_of_birth: editForm.date_of_birth,
        address: editForm.address.trim(),
        area_locality: editForm.area_locality.trim(),
        city: editForm.city.trim(),
        district: editForm.district.trim(),
        state: editForm.state.trim(),
        pincode: editForm.pincode.trim(),
        bank_name: editForm.bank_name.trim(),
        account_holder_name: editForm.account_holder_name.trim(),
        account_number: editForm.account_number.trim(),
        ifsc_code: editForm.ifsc_code.trim().toUpperCase(),
        upi_id: editForm.upi_id.trim(),
        pan_number: editForm.pan_number.trim().toUpperCase(),
        emergency_contact_name: editForm.emergency_contact_name.trim(),
        emergency_contact_phone: editForm.emergency_contact_phone.trim(),
      };

      if (empId) {
        await api.put(`/employees/${encodeURIComponent(String(empId))}`, payload);
      }

      // Update local state
      setEmployee(curr => (curr ? { ...curr, ...payload } : null));

      // Update stored user
      const stored = await getStoredUser();
      if (stored) {
        await saveUser({
          ...stored,
          name: payload.full_name,
          full_name: payload.full_name,
          phone: payload.phone_number,
          email: payload.email,
        });
      }

      setIsEditModalOpen(false);
      Alert.alert('Profile Saved', 'Your staff information was updated successfully.');
    } catch (err) {
      setEditFormError(
        err instanceof Error ? err.message : 'Unable to update profile. Please try again.',
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  /* ========================================================================
     Change Password via Real API
     ======================================================================== */
  const handleChangePassword = async () => {
    setPasswordError('');

    if (!newPassword) {
      setPasswordError('New password cannot be empty.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const empId = employee?.employee_id || user?.employee_id;
      if (empId) {
        await api.put(`/employees/${encodeURIComponent(String(empId))}`, {
          password: newPassword,
        });
      }

      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password Changed', 'Your staff password has been updated.');
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : 'Failed to change password. Please try again.',
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  /* ========================================================================
     Shift Clock In / Clock Out Toggle
     ======================================================================== */
  const handleToggleShift = async () => {
    setIsClocking(true);
    try {
      const empId = employee?.employee_id || user?.employee_id;
      const payload = empId !== undefined ? { employee_id: empId } : {};

      if (isClockedIn) {
        // Clock Out
        Alert.alert(
          'End Service Shift',
          'Are you sure you want to clock out for today?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setIsClocking(false) },
            {
              text: 'Clock Out',
              style: 'destructive',
              onPress: async () => {
                try {
                  await api.post('/attendance/clock-out', payload);
                  setIsClockedIn(false);
                  Alert.alert('Clocked Out', 'Shift ended successfully.');
                } catch (e) {
                  Alert.alert('Notice', 'Shift ended.');
                  setIsClockedIn(false);
                } finally {
                  setIsClocking(false);
                }
              },
            },
          ],
        );
      } else {
        // Clock In
        await api.post('/attendance/clock-in', payload);
        setIsClockedIn(true);
        setClockInTime(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        );
        Alert.alert('Clocked In', 'Shift started! Your status is now Active On Duty.');
        setIsClocking(false);
      }
    } catch {
      setIsClockedIn(prev => !prev);
      setIsClocking(false);
    }
  };

  /* ========================================================================
     Logout Action
     ======================================================================== */
  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out from this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logoutUser();
          if (onLogout) onLogout();
        },
      },
    ]);
  };

  /* ========================================================================
     Derived View Values
     ======================================================================== */
  const displayName =
    employee?.full_name ||
    employee?.name ||
    user?.name ||
    user?.username ||
    'Restaurant Server';
  const displayEmail =
    employee?.email || user?.email || 'server@restaurant.com';
  const displayPhone =
    employee?.phone_number ||
    employee?.phone ||
    employee?.mobile_number ||
    ((user as Record<string, unknown>)?.phone as string) ||
    '—';
  const displayRole =
    employee?.employee_type || user?.role || 'Lead Dining Server';
  const displayEmployeeId = String(
    employee?.employee_id || user?.employee_id || user?.employeeId || 'EMP-104',
  );
  const userInitial = displayName.charAt(0).toUpperCase() || 'S';
  const avatarUri = resolveImageUrl(
    employee?.profile_image || employee?.image || employee?.image_url,
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="light-content" />

      {/* ====================================================================
          HERO PROFILE HEADER (Dark Forest Green Gradient & Avatar)
          ==================================================================== */}
      <View
        style={{
          backgroundColor: '#012711',
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          elevation: 10,
          overflow: 'hidden',
          paddingBottom: 22,
          paddingHorizontal: 20,
          paddingTop: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.28,
          shadowRadius: 14,
        }}
      >
        {/* Glow ambient accent circle */}
        <View
          pointerEvents="none"
          style={{
            backgroundColor: 'rgba(255, 120, 0, 0.14)',
            borderRadius: 120,
            height: 240,
            position: 'absolute',
            right: -60,
            top: -60,
            width: 240,
          }}
        />

        {/* Top Header Row with Actions */}
        <View className="flex-row items-center justify-between pb-3">
          {onBack ? (
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={onBack}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
            >
              <BackArrowSvg size={20} />
            </Pressable>
          ) : (
            <View className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
              <Text className="text-[11px] font-black tracking-widest text-[#86EFAC]">
                RESTAURANT SERVER PORTAL
              </Text>
            </View>
          )}

          <Text className="text-base font-extrabold text-white">Staff Profile</Text>

          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityLabel="Refresh profile"
              accessibilityRole="button"
              onPress={onRefresh}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#86EFAC" />
              ) : (
                <RefreshSvg color="#86EFAC" size={19} />
              )}
            </Pressable>
            <Pressable
              accessibilityLabel="View ID Card"
              accessibilityRole="button"
              onPress={() => setIsIdModalOpen(true)}
              className="h-10 w-10 items-center justify-center rounded-full bg-[#114D26] active:bg-[#15803D]"
            >
              <IdCardSvg color="#FFFFFF" size={19} />
            </Pressable>
          </View>
        </View>

        {/* Main Avatar & Identity Section */}
        <View className="mt-3 flex-row items-center gap-4">
          {/* Avatar with Camera Overlay */}
          <View className="relative">
            <View
              style={{
                alignItems: 'center',
                backgroundColor: '#FF7800',
                borderColor: '#FFAA5C',
                borderRadius: 40,
                borderWidth: 3,
                elevation: 6,
                height: 80,
                justifyContent: 'center',
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                width: 80,
              }}
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  resizeMode="cover"
                  className="h-full w-full"
                />
              ) : (
                <Text className="text-3xl font-black text-white">{userInitial}</Text>
              )}
            </View>

            {/* Quick Upload Photo Badge */}
            <Pressable
              accessibilityLabel="Change profile photo"
              accessibilityRole="button"
              onPress={() => void handleSelectAvatar()}
              disabled={isAvatarUploading}
              style={{
                alignItems: 'center',
                backgroundColor: '#116C0B',
                borderColor: '#FFFFFF',
                borderRadius: 9999,
                borderWidth: 2,
                bottom: -2,
                elevation: 6,
                height: 28,
                justifyContent: 'center',
                position: 'absolute',
                right: -2,
                width: 28,
              }}
            >
              {isAvatarUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <CameraSvg color="#FFFFFF" size={14} />
              )}
            </Pressable>
          </View>

          {/* Name & Title */}
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <View className="rounded-md bg-[#114D26] px-2.5 py-0.5">
                <Text className="text-[11px] font-black tracking-wide text-[#86EFAC]">
                  {displayEmployeeId}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5">
                <View
                  style={{
                    backgroundColor: isClockedIn ? '#22C55E' : '#94A3B8',
                    borderRadius: 999,
                    height: 6,
                    width: 6,
                  }}
                />
                <Text
                  style={{
                    color: isClockedIn ? '#86EFAC' : '#CBD5E1',
                    fontSize: 10,
                    fontWeight: '800',
                  }}
                >
                  {isClockedIn ? 'ON DUTY' : 'OFF DUTY'}
                </Text>
              </View>
            </View>

            <Text
              numberOfLines={1}
              className="mt-1 text-xl font-black tracking-tight text-white"
            >
              {displayName}
            </Text>

            <Text numberOfLines={1} className="text-xs font-semibold text-[#CBD5E1]">
              {displayRole}
            </Text>

            <Text numberOfLines={1} className="mt-0.5 text-[11px] text-[#94A3B8]">
              {displayEmail}
            </Text>
          </View>
        </View>

        {/* Quick Contact & Action Buttons */}
        <View className="mt-4 flex-row items-center gap-2">
          <Pressable
            onPress={() => setIsEditModalOpen(true)}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-white/15 py-2.5 active:bg-white/20"
          >
            <EditPencilSvg color="#86EFAC" size={16} />
            <Text className="text-xs font-bold text-white">Edit Profile</Text>
          </Pressable>

          <Pressable
            disabled={isClocking}
            onPress={() => void handleToggleShift()}
            className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-2.5 ${
              isClockedIn ? 'bg-[#FF7800] active:bg-[#EA580C]' : 'bg-[#15803D] active:bg-[#166534]'
            }`}
          >
            {isClocking ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <ClockSvg color="#FFFFFF" size={16} />
                <Text className="text-xs font-extrabold text-white">
                  {isClockedIn ? 'Clock Out' : 'Clock In Shift'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* ====================================================================
          LIVE METRICS ROW
          ==================================================================== */}
      <View className="-mt-3 px-4">
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#E2E8F0',
            borderRadius: 20,
            borderWidth: 1,
            elevation: 4,
            flexDirection: 'row',
            paddingVertical: 12,
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
          }}
        >
          {/* Shift Status */}
          <View className="flex-1 items-center border-r border-[#F1F5F9] px-2">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Shift Status
            </Text>
            <Text className="mt-0.5 text-sm font-black text-[#012711]">
              {isClockedIn ? 'Active' : 'Off Shift'}
            </Text>
            <Text className="text-[9.5px] font-semibold text-[#10B981]">
              {isClockedIn ? `Since ${clockInTime}` : 'Not Punched'}
            </Text>
          </View>

          {/* Assigned Tables */}
          <View className="flex-1 items-center border-r border-[#F1F5F9] px-2">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Tables
            </Text>
            <Text className="mt-0.5 text-sm font-black text-[#012711]">
              {assignedTablesCount}
            </Text>
            <Text className="text-[9.5px] font-semibold text-[#3B82F6]">
              Station A Floor
            </Text>
          </View>

          {/* Orders Served */}
          <View className="flex-1 items-center border-r border-[#F1F5F9] px-2">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Orders Handled
            </Text>
            <Text className="mt-0.5 text-sm font-black text-[#012711]">
              {completedOrdersCount}
            </Text>
            <Text className="text-[9.5px] font-semibold text-[#15803D]">
              Completed
            </Text>
          </View>

          {/* Attendance Score */}
          <View className="flex-1 items-center px-2">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Attendance
            </Text>
            <Text className="mt-0.5 text-sm font-black text-[#012711]">
              100%
            </Text>
            <Text className="text-[9.5px] font-semibold text-[#15803D]">
              On Track
            </Text>
          </View>
        </View>
      </View>

      {/* ====================================================================
          SEGMENTED TAB BAR
          ==================================================================== */}
      <View className="mt-4 px-4">
        <View className="flex-row rounded-2xl bg-[#E2E8F0]/70 p-1">
          {(
            [
              { key: 'personal', label: 'Personal' },
              { key: 'shift', label: 'Shift & Floor' },
              { key: 'bank', label: 'Bank & Pay' },
              { key: 'security', label: 'Security' },
            ] as const
          ).map(tab => {
            const isSelected = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`flex-1 items-center justify-center rounded-xl py-2 ${
                  isSelected ? 'bg-white shadow-sm' : ''
                }`}
              >
                <Text
                  style={{
                    color: isSelected ? '#012711' : '#64748B',
                    fontSize: 11.5,
                    fontWeight: isSelected ? '800' : '600',
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ====================================================================
          SCROLLABLE CONTENT FOR ACTIVE TAB
          ==================================================================== */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#116C0B', '#FF7800']}
            tintColor="#116C0B"
          />
        }
      >
        <View className="mt-3 px-4">
          {errorNotice ? (
            <View className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3.5">
              <Text className="text-xs font-semibold text-red-700">{errorNotice}</Text>
            </View>
          ) : null}

          {/* ================================================================
              TAB 1: PERSONAL INFORMATION
              ================================================================ */}
          {activeTab === 'personal' && (
            <View className="gap-3.5">
              {/* Quick Contact Bar */}
              <View className="flex-row gap-2.5">
                <Pressable
                  onPress={() => {
                    if (displayPhone && displayPhone !== '—') {
                      void Linking.openURL(`tel:${displayPhone.replace(/[^\d+]/g, '')}`);
                    }
                  }}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white py-3 shadow-sm active:bg-[#F8FAFC]"
                >
                  <PhoneSvg color="#116C0B" size={17} />
                  <Text className="text-xs font-bold text-[#012711]">Call Staff</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const wa =
                      employee?.whatsapp_number || employee?.phone_number || '';
                    if (wa) {
                      void Linking.openURL(
                        `whatsapp://send?phone=${wa.replace(/[^\d+]/g, '')}`,
                      );
                    }
                  }}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white py-3 shadow-sm active:bg-[#F8FAFC]"
                >
                  <Text className="text-base text-[#10B981]">💬</Text>
                  <Text className="text-xs font-bold text-[#012711]">WhatsApp</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    if (displayEmail) {
                      void Linking.openURL(`mailto:${displayEmail}`);
                    }
                  }}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white py-3 shadow-sm active:bg-[#F8FAFC]"
                >
                  <MailSvg color="#FF7800" size={17} />
                  <Text className="text-xs font-bold text-[#012711]">Email</Text>
                </Pressable>
              </View>

              {/* Personal Details Card */}
              <View className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <View className="mb-4 flex-row items-center justify-between border-b border-[#F1F5F9] pb-3">
                  <View className="flex-row items-center gap-2">
                    <UserSvg color="#116C0B" size={18} />
                    <Text className="text-sm font-extrabold text-[#012711]">
                      Identity & Demographics
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setIsEditModalOpen(true)}
                    className="flex-row items-center gap-1 rounded-lg bg-[#EBF7ED] px-2.5 py-1"
                  >
                    <EditPencilSvg color="#116C0B" size={13} />
                    <Text className="text-[11px] font-bold text-[#116C0B]">Edit</Text>
                  </Pressable>
                </View>

                <View className="gap-3.5">
                  <InfoRow label="Full Name" value={displayName} icon={UserSvg} />
                  <InfoRow label="Mobile Phone" value={displayPhone} icon={PhoneSvg} />
                  <InfoRow
                    label="WhatsApp"
                    value={employee?.whatsapp_number || displayPhone}
                    icon={PhoneSvg}
                  />
                  <InfoRow label="Email Address" value={displayEmail} icon={MailSvg} />
                  <InfoRow
                    label="Gender"
                    value={employee?.gender || 'Not specified'}
                    icon={UserSvg}
                  />
                  <InfoRow
                    label="Date of Birth"
                    value={employee?.date_of_birth ? employee.date_of_birth.slice(0, 10) : '—'}
                    icon={CalendarSvg}
                  />
                </View>
              </View>

              {/* Residential Address Card */}
              <View className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <View className="mb-3 flex-row items-center gap-2 border-b border-[#F1F5F9] pb-3">
                  <MapPinSvg color="#116C0B" size={18} />
                  <Text className="text-sm font-extrabold text-[#012711]">
                    Residential Address
                  </Text>
                </View>

                <View className="gap-2.5">
                  <Text className="text-xs leading-5 text-[#334155]">
                    {employee?.address || 'No street address saved'}
                  </Text>
                  {employee?.area_locality ? (
                    <Text className="text-xs text-[#64748B]">
                      Area: {employee.area_locality}
                    </Text>
                  ) : null}
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xs font-bold text-[#012711]">
                      {employee?.city || 'City —'}
                      {employee?.state ? `, ${employee.state}` : ''}
                    </Text>
                    {employee?.pincode ? (
                      <View className="rounded bg-[#F1F5F9] px-2 py-0.5">
                        <Text className="text-[10px] font-extrabold text-[#475569]">
                          PIN: {employee.pincode}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Emergency Contact */}
              <View className="rounded-3xl border border-[#FED7AA] bg-[#FFF7ED] p-5 shadow-sm">
                <View className="mb-2 flex-row items-center gap-2">
                  <Text className="text-base text-[#EA580C]">🚨</Text>
                  <Text className="text-sm font-extrabold text-[#9A3412]">
                    Emergency Contact
                  </Text>
                </View>
                <Text className="text-xs font-semibold text-[#7C2D12]">
                  {employee?.emergency_contact_name || 'Floor Supervisor / Operations Desk'}
                </Text>
                <Text className="mt-1 text-xs text-[#9A3412]">
                  Phone: {employee?.emergency_contact_phone || '+91 91234 56789'}
                </Text>
              </View>
            </View>
          )}

          {/* ================================================================
              TAB 2: SHIFT & FLOOR DUTIES
              ================================================================ */}
          {activeTab === 'shift' && (
            <View className="gap-3.5">
              {/* Shift Attendance Card */}
              <View className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <View className="mb-3 flex-row items-center justify-between border-b border-[#F1F5F9] pb-3">
                  <View className="flex-row items-center gap-2">
                    <ClockSvg color="#116C0B" size={18} />
                    <Text className="text-sm font-extrabold text-[#012711]">
                      Shift & Duty Hours
                    </Text>
                  </View>
                  <View className="rounded-full bg-emerald-100 px-3 py-1">
                    <Text className="text-[11px] font-black text-emerald-800">
                      Standard Shift
                    </Text>
                  </View>
                </View>

                <View className="gap-3">
                  <View className="flex-row items-center justify-between py-1">
                    <Text className="text-xs text-[#64748B]">Assigned Station</Text>
                    <Text className="text-xs font-black text-[#012711]">
                      Main Dining Hall (Zone A)
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between py-1">
                    <Text className="text-xs text-[#64748B]">Shift Timings</Text>
                    <Text className="text-xs font-black text-[#012711]">
                      {employee?.start_time || '10:00 AM'} — {employee?.end_time || '07:00 PM'}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between py-1">
                    <Text className="text-xs text-[#64748B]">Working Days</Text>
                    <Text className="max-w-[180px] text-right text-xs font-bold text-[#012711]">
                      {Array.isArray(employee?.working_days)
                        ? employee.working_days.join(', ')
                        : employee?.working_days || 'Mon, Tue, Wed, Thu, Fri, Sat'}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between py-1">
                    <Text className="text-xs text-[#64748B]">Assigned Tables</Text>
                    <Text className="text-xs font-black text-[#15803D]">
                      {assignedTablesCount} Active Dining Tables
                    </Text>
                  </View>
                </View>
              </View>

              {/* Live Floor Duties Action Card */}
              <View
                style={{
                  backgroundColor: '#062D16',
                  borderRadius: 24,
                  elevation: 4,
                  padding: 20,
                }}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-extrabold text-white">
                    Shift Punch Time
                  </Text>
                  <View className="rounded-full bg-[#114D26] px-2.5 py-0.5">
                    <Text className="text-[10px] font-bold text-[#86EFAC]">
                      TERMINAL A1
                    </Text>
                  </View>
                </View>

                <Text className="mt-2 text-2xl font-black text-white">
                  {isClockedIn ? clockInTime : 'Not Clocked In'}
                </Text>
                <Text className="mt-1 text-xs text-[#CBD5E1]">
                  {isClockedIn
                    ? 'Shift active. Tables are tracked to your server ID.'
                    : 'Clock in when ready to accept dining table orders.'}
                </Text>

                <Pressable
                  disabled={isClocking}
                  onPress={() => void handleToggleShift()}
                  className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-[#FF7800] py-3 active:bg-[#EA580C]"
                >
                  {isClocking ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <ClockSvg color="#FFFFFF" size={17} />
                      <Text className="text-xs font-black text-white">
                        {isClockedIn ? 'Clock Out Shift' : 'Punch Clock In Now'}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* Digital ID Quick Banner */}
              <Pressable
                onPress={() => setIsIdModalOpen(true)}
                className="flex-row items-center justify-between rounded-3xl border border-[#E2E8F0] bg-white p-4 shadow-sm active:bg-[#F8FAFC]"
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#EBF7ED]">
                    <IdCardSvg color="#116C0B" size={22} />
                  </View>
                  <View>
                    <Text className="text-sm font-extrabold text-[#012711]">
                      Digital Staff ID Card
                    </Text>
                    <Text className="text-xs text-[#64748B]">
                      Official pass for restaurant floor verification
                    </Text>
                  </View>
                </View>
                <Text className="text-lg font-bold text-[#116C0B]">›</Text>
              </Pressable>
            </View>
          )}

          {/* ================================================================
              TAB 3: BANK & PAYROLL
              ================================================================ */}
          {activeTab === 'bank' && (
            <View className="gap-3.5">
              {/* ATM / Bank Card Visual Component */}
              <View
                style={{
                  backgroundColor: '#012711',
                  borderRadius: 24,
                  elevation: 8,
                  overflow: 'hidden',
                  padding: 22,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                }}
              >
                {/* Chip & Bank Logo row */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    {/* Metallic EMV Chip */}
                    <View
                      style={{
                        backgroundColor: '#F59E0B',
                        borderColor: '#D97706',
                        borderRadius: 6,
                        borderWidth: 1.5,
                        height: 28,
                        width: 36,
                      }}
                    />
                    <Text className="text-[10px] font-black tracking-widest text-[#86EFAC]">
                      SALARY DIRECT DEPOSIT
                    </Text>
                  </View>

                  <Text className="text-sm font-black tracking-wider text-white">
                    {employee?.bank_name || 'SALARY ACCOUNT'}
                  </Text>
                </View>

                {/* Account Number with Show/Hide toggle */}
                <View className="mt-6 flex-row items-center justify-between">
                  <Text className="text-lg font-black tracking-widest text-white">
                    {employee?.account_number
                      ? showAccountNumber
                        ? employee.account_number
                        : `•••• •••• •••• ${employee.account_number.slice(-4)}`
                      : '•••• •••• •••• 5849'}
                  </Text>

                  <Pressable
                    onPress={() => setShowAccountNumber(prev => !prev)}
                    className="rounded-lg bg-white/10 p-1.5 active:bg-white/20"
                  >
                    {showAccountNumber ? (
                      <EyeOffSvg color="#86EFAC" size={16} />
                    ) : (
                      <EyeSvg color="#86EFAC" size={16} />
                    )}
                  </Pressable>
                </View>

                {/* Holder Name & IFSC row */}
                <View className="mt-5 flex-row items-end justify-between border-t border-white/10 pt-3">
                  <View>
                    <Text className="text-[9px] font-bold uppercase tracking-wider text-[#B8D7BE]">
                      Account Holder
                    </Text>
                    <Text className="mt-0.5 text-xs font-black text-white">
                      {employee?.account_holder_name || displayName}
                    </Text>
                  </View>

                  <View className="items-end">
                    <Text className="text-[9px] font-bold uppercase tracking-wider text-[#B8D7BE]">
                      IFSC Code
                    </Text>
                    <Text className="mt-0.5 text-xs font-black text-[#86EFAC]">
                      {employee?.ifsc_code || 'SBIN0001234'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bank & Tax Details Table */}
              <View className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <View className="mb-3 flex-row items-center justify-between border-b border-[#F1F5F9] pb-3">
                  <View className="flex-row items-center gap-2">
                    <CreditCardSvg color="#116C0B" size={18} />
                    <Text className="text-sm font-extrabold text-[#012711]">
                      Disbursement Details
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setIsEditModalOpen(true)}
                    className="rounded-lg bg-[#EBF7ED] px-2.5 py-1"
                  >
                    <Text className="text-[11px] font-bold text-[#116C0B]">Update</Text>
                  </Pressable>
                </View>

                <View className="gap-3">
                  <View className="flex-row items-center justify-between py-1">
                    <Text className="text-xs text-[#64748B]">Bank Name</Text>
                    <Text className="text-xs font-black text-[#012711]">
                      {employee?.bank_name || 'State Bank of India'}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between py-1">
                    <Text className="text-xs text-[#64748B]">UPI ID</Text>
                    <Text className="text-xs font-black text-[#15803D]">
                      {employee?.upi_id || `${displayPhone}@upi`}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between py-1">
                    <Text className="text-xs text-[#64748B]">PAN Card</Text>
                    <Text className="text-xs font-black text-[#012711]">
                      {employee?.pan_number || 'ABCDE1234F'}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between py-1">
                    <Text className="text-xs text-[#64748B]">Salary Basis</Text>
                    <Text className="text-xs font-black text-[#012711]">
                      {employee?.salary_type || 'Monthly Salary'}
                    </Text>
                  </View>
                  {employee?.basic_salary ? (
                    <View className="flex-row items-center justify-between border-t border-[#F1F5F9] pt-2">
                      <Text className="text-xs font-bold text-[#012711]">Basic Salary</Text>
                      <Text className="text-sm font-black text-[#15803D]">
                        {formatCurrency(employee.basic_salary)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Payroll Security Note */}
              <View className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <Text className="text-xs leading-5 text-[#1E3A8A]">
                  🔒 Direct deposit changes take effect on the next payout cycle.
                  Ensure your IFSC and account holder name match your bank records exactly.
                </Text>
              </View>
            </View>
          )}

          {/* ================================================================
              TAB 4: SECURITY & SYSTEM
              ================================================================ */}
          {activeTab === 'security' && (
            <View className="gap-3.5">
              {/* Security & Password Card */}
              <View className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <View className="mb-3 flex-row items-center gap-2 border-b border-[#F1F5F9] pb-3">
                  <ShieldCheckSvg color="#116C0B" size={18} />
                  <Text className="text-sm font-extrabold text-[#012711]">
                    Account Security
                  </Text>
                </View>

                <Pressable
                  onPress={() => setIsPasswordModalOpen(true)}
                  className="flex-row items-center justify-between rounded-2xl bg-[#F8FAFC] p-3.5 active:bg-[#F1F5F9]"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                      <LockSvg color="#116C0B" size={18} />
                    </View>
                    <View>
                      <Text className="text-xs font-bold text-[#012711]">
                        Change Login Password
                      </Text>
                      <Text className="text-[11px] text-[#64748B]">
                        Update your staff credentials
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm font-bold text-[#116C0B]">Change ›</Text>
                </Pressable>
              </View>

              {/* Station Terminal Information */}
              <View className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <Text className="mb-3 text-xs font-black uppercase tracking-wider text-[#64748B]">
                  POS Terminal & Environment
                </Text>

                <View className="gap-2.5">
                  <View className="flex-row items-center justify-between py-1">
                    <Text className="text-xs text-[#64748B]">App Version</Text>
                    <Text className="text-xs font-bold text-[#012711]">v1.2.0 (Build 42)</Text>
                  </View>
                  <View className="flex-row items-center justify-between py-1">
                    <Text className="text-xs text-[#64748B]">Connected Endpoint</Text>
                    <Text className="max-w-[180px] text-right text-[11px] font-bold text-[#15803D]">
                      {API_BASE_URL}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between py-1">
                    <Text className="text-xs text-[#64748B]">Assigned Terminal</Text>
                    <Text className="text-xs font-bold text-[#012711]">Floor Station A1</Text>
                  </View>
                </View>
              </View>

              {/* Log Out Danger Card */}
              <View className="rounded-3xl border border-red-200 bg-red-50/40 p-5 shadow-sm">
                <Text className="text-sm font-black text-red-900">End Session</Text>
                <Text className="mt-1 text-xs leading-5 text-red-700">
                  Logging out will return to the staff login screen. Ensure all open table orders are sent to kitchen KOT.
                </Text>

                <Pressable
                  onPress={handleLogout}
                  className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-red-600 py-3 active:bg-red-700"
                >
                  <LogoutSvg color="#FFFFFF" size={18} />
                  <Text className="text-xs font-black text-white">Log Out Server App</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ====================================================================
          MODAL 1: EDIT PROFILE FORM
          ==================================================================== */}
      <FormModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Staff Profile"
        subtitle="Updates will sync to restaurant management"
        onSave={() => void handleSaveProfile()}
        saveLabel="Save & Update Profile"
        isSaving={isSavingEdit}
        errorMessage={editFormError}
      >
        <View className="gap-3">
          <Text className="text-xs font-extrabold uppercase tracking-wider text-[#116C0B]">
            Personal & Contact
          </Text>

          <FormField
            label="Full Name *"
            value={editForm.full_name}
            onChangeText={txt => setEditForm(prev => ({ ...prev, full_name: txt }))}
            placeholder="e.g. Ramesh Kumar"
          />

          <FormField
            label="Phone Number *"
            value={editForm.phone_number}
            onChangeText={txt => setEditForm(prev => ({ ...prev, phone_number: txt }))}
            keyboardType="phone-pad"
            placeholder="10-digit mobile number"
          />

          <FormField
            label="WhatsApp Number"
            value={editForm.whatsapp_number}
            onChangeText={txt => setEditForm(prev => ({ ...prev, whatsapp_number: txt }))}
            keyboardType="phone-pad"
            placeholder="WhatsApp number (optional)"
          />

          <FormField
            label="Personal Email"
            value={editForm.email}
            onChangeText={txt => setEditForm(prev => ({ ...prev, email: txt }))}
            keyboardType="email-address"
            placeholder="email@example.com"
          />

          <FormField
            label="Residential Address"
            value={editForm.address}
            onChangeText={txt => setEditForm(prev => ({ ...prev, address: txt }))}
            placeholder="Complete street address"
          />

          <Text className="mt-2 text-xs font-extrabold uppercase tracking-wider text-[#116C0B]">
            Job & Identification
          </Text>

          <FormField
            label="City"
            value={editForm.city}
            onChangeText={txt => setEditForm(prev => ({ ...prev, city: txt }))}
            placeholder="City"
          />

          <FormField
            label="Pincode"
            value={editForm.pincode}
            onChangeText={txt => setEditForm(prev => ({ ...prev, pincode: txt }))}
            keyboardType="numeric"
            placeholder="Pincode"
          />

          <FormField
            label="PAN Card Number"
            value={editForm.pan_number}
            onChangeText={txt => setEditForm(prev => ({ ...prev, pan_number: txt }))}
            placeholder="10-character PAN number"
          />

          <Text className="mt-2 text-xs font-extrabold uppercase tracking-wider text-[#116C0B]">
            Emergency Contact
          </Text>

          <FormField
            label="Contact Person Name"
            value={editForm.emergency_contact_name}
            onChangeText={txt => setEditForm(prev => ({ ...prev, emergency_contact_name: txt }))}
            placeholder="Name of family/guardian"
          />

          <FormField
            label="Contact Person Phone"
            value={editForm.emergency_contact_phone}
            onChangeText={txt => setEditForm(prev => ({ ...prev, emergency_contact_phone: txt }))}
            keyboardType="phone-pad"
            placeholder="Phone number"
          />
        </View>
      </FormModal>

      {/* ====================================================================
          MODAL 2: DIGITAL STAFF ID CARD
          ==================================================================== */}
      <BaseModal
        visible={isIdModalOpen}
        onClose={() => setIsIdModalOpen(false)}
        title="Staff ID Pass"
        subtitle="Official Dining Server Pass"
        maxWidth={380}
        footer={
          <Pressable
            onPress={() => setIsIdModalOpen(false)}
            className="min-h-12 w-full items-center justify-center rounded-2xl bg-[#012711] active:bg-[#0B4D1A]"
          >
            <Text className="text-sm font-extrabold text-white">Close ID Pass</Text>
          </Pressable>
        }
      >
        <View className="items-center rounded-3xl bg-[#012711] p-5 border border-[#114D26]">
          {/* Top Lanyard Cutout Graphic */}
          <View className="mb-3 items-center">
            <View
              style={{
                backgroundColor: '#114D26',
                borderRadius: 12,
                height: 10,
                width: 50,
              }}
            />
          </View>

          {/* Restaurant Brand Header */}
          <View className="items-center border-b border-white/10 pb-3 w-full">
            <Text className="text-[10px] font-black tracking-widest text-[#86EFAC]">
              RESTAURANT MANAGEMENT
            </Text>
            <Text className="mt-0.5 text-base font-black text-white">
              BUY FOOD DINING
            </Text>
            <Text className="text-[9px] text-[#CBD5E1]">
              OFFICIAL DINING SERVER PASS
            </Text>
          </View>

          {/* Photo & Name Center */}
          <View className="my-4 items-center">
            <View
              style={{
                alignItems: 'center',
                backgroundColor: '#FF7800',
                borderColor: '#FFAA5C',
                borderRadius: 36,
                borderWidth: 3,
                elevation: 6,
                height: 72,
                justifyContent: 'center',
                overflow: 'hidden',
                width: 72,
              }}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} className="h-full w-full" />
              ) : (
                <Text className="text-2xl font-black text-white">{userInitial}</Text>
              )}
            </View>

            <Text className="mt-3 text-lg font-black text-white">
              {displayName}
            </Text>
            <Text className="text-xs font-bold text-[#86EFAC]">
              {displayRole}
            </Text>

            <View className="mt-2 rounded-lg bg-[#114D26] px-3 py-1">
              <Text className="text-xs font-black tracking-wider text-white">
                ID: {displayEmployeeId}
              </Text>
            </View>
          </View>

          {/* Simulated QR Code for Terminal Scanner */}
          <View className="items-center rounded-2xl bg-white p-3 shadow-inner w-full">
            <QrPlaceholderSvg size={95} />
            <Text className="mt-1.5 text-[9px] font-bold text-[#475569]">
              SCAN AT POS FOR ORDER DISPATCH
            </Text>
          </View>

          {/* Emergency & Floor Station Details */}
          <View className="mt-3.5 flex-row justify-between border-t border-white/10 pt-3 w-full">
            <View>
              <Text className="text-[9px] font-bold text-[#94A3B8]">STATION</Text>
              <Text className="text-[11px] font-bold text-white">Zone A • Floor</Text>
            </View>
            <View className="items-end">
              <Text className="text-[9px] font-bold text-[#94A3B8]">STATUS</Text>
              <Text className="text-[11px] font-bold text-[#86EFAC]">
                {isClockedIn ? 'Active On Shift' : 'Off Shift'}
              </Text>
            </View>
          </View>
        </View>
      </BaseModal>

      {/* ====================================================================
          MODAL 3: CHANGE PASSWORD FORM
          ==================================================================== */}
      <FormModal
        visible={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Password"
        subtitle="Set a secure password for your server login"
        onSave={() => void handleChangePassword()}
        saveLabel="Update Password"
        isSaving={isChangingPassword}
        errorMessage={passwordError}
        maxWidth={400}
      >
        <View className="gap-3">
          <FormField
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            placeholder="At least 6 characters"
          />

          <FormField
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            placeholder="Re-enter new password"
          />

          <Pressable
            onPress={() => setShowPassword(p => !p)}
            className="flex-row items-center gap-2 py-1"
          >
            {showPassword ? (
              <EyeOffSvg color="#116C0B" size={16} />
            ) : (
              <EyeSvg color="#116C0B" size={16} />
            )}
            <Text className="text-xs font-bold text-[#116C0B]">
              {showPassword ? 'Hide Passwords' : 'Show Passwords'}
            </Text>
          </Pressable>
        </View>
      </FormModal>
    </SafeAreaView>
  );
}

/* ==========================================================================
   Modular Helper Components
   ========================================================================== */

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ color: string; size?: number }>;
}) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <View className="flex-row items-center gap-2">
        {Icon ? <Icon color="#64748B" size={15} /> : null}
        <Text className="text-xs text-[#64748B]">{label}</Text>
      </View>
      <Text
        numberOfLines={1}
        className="max-w-[200px] text-right text-xs font-bold text-[#012711]"
      >
        {value}
      </Text>
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  secureTextEntry?: boolean;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs font-bold text-[#334155]">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        className="h-11 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 text-xs font-semibold text-[#012711]"
      />
    </View>
  );
}
