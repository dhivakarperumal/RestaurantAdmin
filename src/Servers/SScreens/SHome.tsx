import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import api, { API_BASE_URL, getStoredUser } from '../../../api';
import type { HeaderUser } from '../../Admin/Navigation/TopHeader';
import ServerBottomBar, { type ServerTab } from '../SNavigations/SBottombsr';
import ServerTopHeader from '../SNavigations/STopHeder';
import ServerFoods from './SFoods';
import ServerOrders from './SOrders';
import ServerMore from './SMore';
import ServerProfile from './Profile';
import ServerItems, { type ServerOrderTable } from './SItems';
import ServerTables from './STables';
import { BaseModal, ConfirmDialog, DetailsModal } from '../../components/popups';

/* ==========================================================================
   Types & Utilities
   ========================================================================== */

type Row = Record<string, unknown>;

type ServerTable = {
  id?: string | number;
  table_id?: string | number;
  table_number?: string | number;
  no_of_seats?: number | string;
  image_url?: string | null;
  status?: string;
  assigned_server_id?: string | number | null;
  assigned_employee_id?: string | number | null;
  server_id?: string | number | null;
  employee_id?: string | number | null;
  user_id?: string | number | null;
  assigned_to?: string | number | null;
  waiter_id?: string | number | null;
  assigned_server_name?: string | null;
  server_name?: string | null;
  assigned_server?: {
    id?: string | number;
    employee_id?: string | number;
    name?: string;
    full_name?: string;
  } | null;
};

type OrderItem = {
  id?: string | number;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
};

function rows(payload: unknown): Row[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      value => typeof value === 'object' && value !== null,
    ) as Row[];
  }
  if (typeof payload !== 'object' || payload === null) return [];
  const record = payload as Record<string, unknown>;
  for (const key of ['data', 'orders', 'foods', 'employees', 'tables', 'server_tables']) {
    if (key in record) return rows(record[key]);
  }
  return [];
}

function value(row: Row, keys: string[], fallback = '—'): string {
  for (const key of keys) {
    const item = row[key];
    if (typeof item === 'string' || typeof item === 'number') {
      const text = String(item).trim();
      if (text) return text;
    }
  }
  return fallback;
}

function isTodayOrder(order: Row): boolean {
  const rawDate = order.created_at ?? order.createdAt ?? order.order_date ?? order.order_time;
  if (!rawDate) return false;
  const date = new Date(String(rawDate));
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function orderStatus(order: Row): string {
  return value(order, ['status', 'order_status'], '').trim().toLowerCase().replace(/[-\s]+/g, '_');
}

function isReadyOrder(order: Row): boolean {
  const status = orderStatus(order);
  return status.includes('ready') || status === 'prepared' || status === 'cooked';
}

function isActiveOrder(order: Row): boolean {
  const status = orderStatus(order);
  return (
    status === 'pending' ||
    status === 'confirmed' ||
    status.includes('prepar') ||
    status.includes('cook') ||
    isReadyOrder(order)
  );
}

function orderBelongsToUser(order: Row, user: HeaderUser): boolean {
  const identityValues = [
    user.employee_id,
    user.employeeId,
    user.id,
    user.user_id,
    (user as Record<string, unknown>).uuid,
    (user as Record<string, unknown>).emp_id,
  ]
    .filter(id => id !== undefined && id !== null && String(id).trim() !== '')
    .map(id => String(id).trim().toLowerCase());

  const orderIdentityValues = [
    order.server_id,
    order.assigned_server_id,
    order.employee_id,
    order.assigned_employee_id,
    order.waiter_id,
    order.user_id,
    order.created_by_id,
    order.created_by,
  ]
    .filter(id => id !== undefined && id !== null && String(id).trim() !== '')
    .map(id => String(id).trim().toLowerCase());

  if (identityValues.some(id => orderIdentityValues.includes(id))) return true;

  const userNames = [user.name, user.username, (user as Record<string, unknown>).full_name]
    .filter(name => typeof name === 'string' && name.trim() !== '')
    .map(name => String(name).trim().toLowerCase());
  const orderNames = [
    order.server_name,
    order.assigned_server_name,
    order.waiter_name,
    order.created_by_name,
  ]
    .filter(name => typeof name === 'string' && name.trim() !== '')
    .map(name => String(name).trim().toLowerCase());

  if (userNames.some(name => orderNames.includes(name))) return true;

  for (const key of ['server', 'assigned_server', 'waiter']) {
    const assigned = order[key];
    if (!assigned || typeof assigned !== 'object') continue;
    const record = assigned as Row;
    const nestedId = record.id ?? record.employee_id ?? record.user_id;
    const nestedName = record.name ?? record.full_name ?? record.username;
    if (
      (nestedId !== undefined &&
        identityValues.includes(String(nestedId).trim().toLowerCase())) ||
      (nestedName !== undefined &&
        userNames.includes(String(nestedName).trim().toLowerCase()))
    ) {
      return true;
    }
  }

  return false;
}

function formatPrice(amount: unknown): string {
  const num = Number(amount || 0);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTime(dateStr: unknown): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getOrderItems(order: Row): OrderItem[] {
  const items = order.items || order.order_items || order.food_items;
  if (Array.isArray(items)) {
    return items.map(item => {
      const record =
        typeof item === 'object' && item !== null
          ? (item as Record<string, unknown>)
          : {};
      return {
        id: (record.food_id || record.id || record.product_id) as string | number,
        name: String(
          record.food_name || record.product_name || record.name || 'Menu item',
        ),
        quantity: Number(record.quantity || record.qty || 1),
        price: Number(record.unit_price || record.price || record.total_price || 0),
        notes: typeof record.notes === 'string' ? record.notes : undefined,
      };
    });
  }
  return [];
}

function imageUri(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^(https?:|data:image\/|file:|content:)/i.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.startsWith('//')) {
      const protocol = API_BASE_URL.match(/^(https?:)/i)?.[1] || 'https:';
      return `${protocol}${trimmed}`;
    }
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        return imageUri(JSON.parse(trimmed) as unknown);
      } catch {
        return undefined;
      }
    }
    const apiRoot = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
    return `${apiRoot}/${trimmed.replace(/^\.?\//, '')}`;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const uri = imageUri(entry);
      if (uri) return uri;
    }
  }
  if (typeof value === 'object' && value !== null) {
    const rec = value as Record<string, unknown>;
    return (
      imageUri(rec.url) ||
      imageUri(rec.image_url) ||
      imageUri(rec.imageUrl) ||
      imageUri(rec.image) ||
      imageUri(rec.src) ||
      imageUri(rec.path)
    );
  }
  return undefined;
}

function imageValue(row: Row): string | undefined {
  for (const key of [
    'food_images',
    'food_image',
    'food_image_url',
    'image_url',
    'image',
    'imageUrl',
    'thumbnail',
  ]) {
    const uri = imageUri(row[key]);
    if (uri) return uri;
  }
  return undefined;
}

function getFoodName(food: Row): string {
  return value(
    food,
    ['food_name', 'product_name', 'productName', 'name', 'item_name', 'title'],
    'Menu Item',
  );
}

function getFoodCategory(food: Row): string {
  return value(
    food,
    [
      'category_name',
      'categoryName',
      'category',
      'cuisine_name',
      'cuisine',
      'food_type',
    ],
    'Special',
  );
}

function getFoodPrice(food: Row): number {
  for (const key of [
    'final_price',
    'price',
    'food_price',
    'selling_price',
    'unit_price',
    'mrp',
  ]) {
    const raw = food[key];
    if (raw !== undefined && raw !== null && raw !== '') {
      const num = Number(raw);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return 0;
}

function getFoodType(food: Row): 'veg' | 'non-veg' {
  const typeStr = value(
    food,
    ['food_type', 'type', 'food_preference', 'dietary'],
    '',
  ).toLowerCase();
  if (typeStr.includes('non') || typeStr === 'non-veg' || typeStr === 'nonveg') {
    return 'non-veg';
  }
  if (typeStr.includes('veg') || typeStr === 'vegan') {
    return 'veg';
  }
  const isVeg = food.is_veg;
  if (isVeg === false || isVeg === 0 || isVeg === '0' || isVeg === 'false') {
    return 'non-veg';
  }
  if (isVeg === true || isVeg === 1 || isVeg === '1' || isVeg === 'true') {
    return 'veg';
  }
  const name = getFoodName(food).toLowerCase();
  if (
    /(chicken|mutton|fish|prawn|egg|pork|beef|meat|crab|lamb|tikka|kebab)/i.test(
      name,
    )
  ) {
    return 'non-veg';
  }
  return 'veg';
}

export function resolveServerEmployeeId(
  employees: Record<string, unknown>[],
  user: HeaderUser | null | undefined,
  tables: ServerTable[] = [],
): string | number | null {
  if (!user) return null;

  const uName = String(user.name || user.username || '').toLowerCase().trim();
  const uEmail = String(user.email || '').toLowerCase().trim();
  const uPhone = String(
    (user as Record<string, unknown>)?.mobile_number ||
    (user as Record<string, unknown>)?.phone ||
    '',
  ).replace(/\D/g, '');

  const explicitEmpId = user.employee_id ?? user.employeeId ?? (user as Record<string, unknown>)?.emp_id;
  if (explicitEmpId !== undefined && explicitEmpId !== null && String(explicitEmpId).trim() !== '') {
    return explicitEmpId as string | number;
  }

  // 1. Check if user name matches any table in tables
  if (uName && tables.length) {
    for (const t of tables) {
      const sName = String(t.assigned_server_name ?? t.server_name ?? '').toLowerCase().trim();
      const sId = t.assigned_server_id ?? t.assigned_employee_id ?? t.server_id;
      if (sName && sId !== undefined && sId !== null && String(sId).trim() !== '') {
        if (sName === uName || sName.includes(uName) || uName.includes(sName)) {
          return sId as string | number;
        }
      }
    }
  }

  // 2. Search in employees list
  if (employees.length) {
    // 2a. Match by email
    if (uEmail) {
      const match = employees.find(e => String(e.email || '').toLowerCase().trim() === uEmail);
      if (match) {
        const id = match.employee_id ?? match.id;
        if (id !== undefined && id !== null) return id as string | number;
      }
    }

    // 2b. Match by phone
    if (uPhone && uPhone.length >= 7) {
      const match = employees.find(e => {
        const p = String(e.phone_number || e.phone || e.mobile || '').replace(/\D/g, '');
        return p && (p.includes(uPhone) || uPhone.includes(p));
      });
      if (match) {
        const id = match.employee_id ?? match.id;
        if (id !== undefined && id !== null) return id as string | number;
      }
    }

    // 2c. Match by exact name
    if (uName) {
      const match = employees.find(e => {
        const n = String(e.full_name || e.name || '').toLowerCase().trim();
        return n && (n === uName || n.replace(/\s+/g, '') === uName.replace(/\s+/g, ''));
      });
      if (match) {
        const id = match.employee_id ?? match.id;
        if (id !== undefined && id !== null) return id as string | number;
      }

      // 2d. Substring name match (prioritize Server role)
      const serverMatch = employees.find(e => {
        const isServer = String(e.employee_type || e.role || '').toLowerCase().includes('server');
        const n = String(e.full_name || e.name || '').toLowerCase().trim();
        return isServer && n && (n.includes(uName) || uName.includes(n));
      });
      if (serverMatch) {
        const id = serverMatch.employee_id ?? serverMatch.id;
        if (id !== undefined && id !== null) return id as string | number;
      }

      const anyNameMatch = employees.find(e => {
        const n = String(e.full_name || e.name || '').toLowerCase().trim();
        return n && (n.includes(uName) || uName.includes(n));
      });
      if (anyNameMatch) {
        const id = anyNameMatch.employee_id ?? anyNameMatch.id;
        if (id !== undefined && id !== null) return id as string | number;
      }
    }

    // 2e. If exactly 1 server employee exists in restaurant, that's the logged in server
    const servers = employees.filter(e =>
      String(e.employee_type || e.role || '').toLowerCase().includes('server'),
    );
    if (servers.length === 1) {
      const id = servers[0].employee_id ?? servers[0].id;
      if (id !== undefined && id !== null) return id as string | number;
    }
  }

  return null;
}

function isTableAssignedToServer(
  table: ServerTable,
  user: HeaderUser,
  extraEmployeeId?: string | number | null,
): boolean {
  const userIds = [
    user.employee_id,
    user.employeeId,
    (user as Record<string, unknown>)?.emp_id,
    extraEmployeeId,
  ]
    .filter(val => val !== undefined && val !== null && String(val).trim() !== '')
    .map(val => String(val).trim());

  const userNames = [
    user.name,
    user.username,
    (user as Record<string, unknown>)?.full_name,
  ]
    .filter(val => typeof val === 'string' && val.trim() !== '')
    .map(val => (val as string).toLowerCase().trim());

  const tableServerIds = [
    table.assigned_server_id,
    table.assigned_employee_id,
    table.server_id,
    table.employee_id,
    table.user_id,
    table.assigned_to,
    table.waiter_id,
  ];

  for (const rawId of tableServerIds) {
    if (rawId !== undefined && rawId !== null && String(rawId).trim() !== '') {
      if (userIds.includes(String(rawId).trim())) {
        return true;
      }
    }
  }

  if (table.assigned_server && typeof table.assigned_server === 'object') {
    const sId = table.assigned_server.employee_id ?? table.assigned_server.id;
    if (sId !== undefined && sId !== null && userIds.includes(String(sId).trim())) {
      return true;
    }
  }

  const serverNames = [
    table.assigned_server_name,
    table.server_name,
    table.assigned_server?.name,
    table.assigned_server?.full_name,
  ]
    .filter(Boolean)
    .map(s => String(s).toLowerCase().trim());

  for (const sName of serverNames) {
    for (const uName of userNames) {
      if (
        sName === uName ||
        sName.includes(uName) ||
        uName.includes(sName) ||
        sName.replace(/\s+/g, '') === uName.replace(/\s+/g, '')
      ) {
        return true;
      }
    }
  }

  return false;
}

function VegDotSvg({ size = 13 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 2.5,
        borderWidth: 1.5,
        borderColor: '#15803D',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
      }}
    >
      <View
        style={{
          width: size * 0.45,
          height: size * 0.45,
          borderRadius: 999,
          backgroundColor: '#15803D',
        }}
      />
    </View>
  );
}

function NonVegDotSvg({ size = 13 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 2.5,
        borderWidth: 1.5,
        borderColor: '#DC2626',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
      }}
    >
      <View
        style={{
          width: size * 0.45,
          height: size * 0.45,
          borderRadius: 999,
          backgroundColor: '#DC2626',
        }}
      />
    </View>
  );
}

/* ==========================================================================
   Crisp Modern SVG Icons
   ========================================================================== */

function TableSvg({ color = '#116C0B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="6" width="16" height="5" rx="1.5" stroke={color} strokeWidth="2" />
      <Path d="M7 11v8M17 11v8M3 4v3M21 4v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function ClockSvg({ color = '#116C0B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <Path d="M12 7v5l3 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UtensilsSvg({ color = '#116C0B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M8 12v9M15 3c2 2 3 5 3 7h-4V3M16 10v11"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ReceiptListSvg({ color = '#116C0B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Zm0 7h6m-6 4h4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function CheckCircleSvg({ color = '#10B981', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <Path d="m8.5 12 2.5 2.5 5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function FlameSvg({ color = '#F97316', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2c.5 3 2.5 5 4.5 7.5C18 11.5 19 13.5 19 16a7 7 0 1 1-14 0c0-3.5 2.5-6.5 4.5-9 0 2.5 1.5 4.5 3 5 0-3 1-7.5-.5-10Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SearchSvg({ color = '#64748B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
      <Path d="m20 20-4-4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function UsersSvg({ color = '#64748B', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2" />
      <Path d="M2 20a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M18 14a6 6 0 0 1 4 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function CloseSvg({ color = '#64748B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function SparklesSvg({ color = '#F59E0B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m12 3 1.9 4.8L18.7 9.7l-4.8 1.9L12 16.5l-1.9-4.9-4.9-1.9 4.9-1.9L12 3ZM19 17l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ==========================================================================
   Stat Card Component
   ========================================================================== */

type StatTone = 'green' | 'orange' | 'indigo' | 'teal';

const statToneStyles: Record<
  StatTone,
  { bg: string; border: string; text: string; badgeBg: string; badgeText: string; lightBg: string }
> = {
  green: {
    bg: '#06391A',
    border: '#116C0B',
    text: '#FFFFFF',
    badgeBg: '#114D26',
    badgeText: '#86EFAC',
    lightBg: '#E8F5E9',
  },
  orange: {
    bg: '#7C2D12',
    border: '#EA580C',
    text: '#FFFFFF',
    badgeBg: '#9A3412',
    badgeText: '#FDBA74',
    lightBg: '#FFF7ED',
  },
  indigo: {
    bg: '#1E1B4B',
    border: '#4F46E5',
    text: '#FFFFFF',
    badgeBg: '#312E81',
    badgeText: '#C7D2FE',
    lightBg: '#EEF2FF',
  },
  teal: {
    bg: '#042F2E',
    border: '#0D9488',
    text: '#FFFFFF',
    badgeBg: '#115E59',
    badgeText: '#99F6E4',
    lightBg: '#F0FDFA',
  },
};

function StatCard({
  label,
  value,
  subtext,
  badge,
  tone,
  icon: Icon,
  onPress,
}: {
  label: string;
  value: string | number;
  subtext: string;
  badge: string;
  tone: StatTone;
  icon: React.ComponentType<{ color: string; size: number }>;
  onPress?: () => void;
}) {
  const t = statToneStyles[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        backgroundColor: t.bg,
        borderColor: t.border,
        borderWidth: 1,
        borderRadius: 20,
        elevation: 4,
        flex: 1,
        minHeight: 124,
        overflow: 'hidden',
        padding: 14,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View
          style={{
            backgroundColor: t.badgeBg,
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text
            style={{
              color: t.badgeText,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 0.5,
            }}
          >
            {badge}
          </Text>
        </View>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: 9999,
            height: 32,
            justifyContent: 'center',
            width: 32,
          }}
        >
          <Icon color={t.text} size={16} />
        </View>
      </View>
      <View className="mt-3">
        <Text style={{ color: t.text, fontSize: 24, fontWeight: '800' }}>
          {value}
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: 12,
            fontWeight: '700',
            marginTop: 2,
          }}
        >
          {label}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: 'rgba(255,255,255,0.65)',
            fontSize: 10,
            marginTop: 2,
          }}
        >
          {subtext}
        </Text>
      </View>
    </Pressable>
  );
}

/* ==========================================================================
   Order Card Component
   ========================================================================== */

function OrderCard({
  order,
  onPress,
  onServe,
}: {
  order: Row;
  onPress: () => void;
  onServe?: () => void;
}) {
  const orderNumber = value(order, ['order_number', 'order_id', 'id'], '#000');
  const tableNum = value(order, ['table_number', 'table_id', 'table'], '');
  const customerName = value(order, ['customer_name', 'customerName', 'customer'], 'Guest');
  const orderStatus = value(order, ['status', 'order_status'], 'Pending').toLowerCase();
  const totalAmount = value(order, ['total_amount', 'grand_total', 'amount'], '0');
  const createdAt = value(order, ['created_at', 'order_date'], '');
  const time = formatTime(createdAt);
  const items = getOrderItems(order);

  // Status visual attributes
  let statusBadgeStyle = { bg: '#FEF3C7', text: '#B45309', label: 'Preparing' };
  if (['ready', 'prepared', 'cooked'].includes(orderStatus)) {
    statusBadgeStyle = { bg: '#DCFCE7', text: '#15803D', label: 'Ready to Serve' };
  } else if (['pending', 'new'].includes(orderStatus)) {
    statusBadgeStyle = { bg: '#E0E7FF', text: '#4338CA', label: 'Pending' };
  } else if (['confirmed'].includes(orderStatus)) {
    statusBadgeStyle = { bg: '#CCFBF1', text: '#0F766E', label: 'Confirmed' };
  } else if (['delivered', 'completed', 'served'].includes(orderStatus)) {
    statusBadgeStyle = { bg: '#F1F5F9', text: '#475569', label: 'Served' };
  }

  const isReady = ['ready', 'prepared', 'cooked'].includes(orderStatus);

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: isReady ? '#86EFAC' : '#E2E8F0',
        borderRadius: 18,
        borderWidth: isReady ? 1.5 : 1,
        elevation: 2,
        marginBottom: 12,
        overflow: 'hidden',
        padding: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      }}
    >
      {/* Card Top Row: Order #, Table Badge, Status Badge */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-extrabold text-[#012711]">
            {orderNumber}
          </Text>
          {tableNum && tableNum !== '—' ? (
            <View className="rounded-lg bg-[#F0FDF4] px-2.5 py-1 border border-[#BBF7D0]">
              <Text className="text-xs font-bold text-[#15803D]">
                Table {tableNum}
              </Text>
            </View>
          ) : (
            <View className="rounded-lg bg-[#F8FAFC] px-2 py-0.5 border border-[#E2E8F0]">
              <Text className="text-[10px] font-semibold text-[#64748B]">
                Takeaway
              </Text>
            </View>
          )}
        </View>

        <View
          style={{
            backgroundColor: statusBadgeStyle.bg,
            borderRadius: 9999,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              color: statusBadgeStyle.text,
              fontSize: 11,
              fontWeight: '700',
            }}
          >
            {statusBadgeStyle.label}
          </Text>
        </View>
      </View>

      {/* Guest Name & Order Time */}
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-xs font-medium text-[#64748B]">
          Guest: <Text className="font-semibold text-[#334155]">{customerName}</Text>
        </Text>
        {time ? (
          <Text className="text-[11px] text-[#94A3B8]">
            🕒 {time}
          </Text>
        ) : null}
      </View>

      {/* Items Summary */}
      <View className="mt-3 rounded-xl bg-[#F8FAFC] p-2.5">
        {items.length > 0 ? (
          <View className="gap-1">
            {items.slice(0, 3).map((item, idx) => (
              <View key={`${item.name}-${idx}`} className="flex-row items-center justify-between">
                <Text numberOfLines={1} className="flex-1 text-xs text-[#334155]">
                  <Text className="font-bold text-[#012711]">{item.quantity}x</Text> {item.name}
                </Text>
                {item.price ? (
                  <Text className="ml-2 text-xs font-semibold text-[#64748B]">
                    {formatPrice(item.price * item.quantity)}
                  </Text>
                ) : null}
              </View>
            ))}
            {items.length > 3 ? (
              <Text className="mt-0.5 text-[11px] font-bold text-[#116C0B]">
                +{items.length - 3} more items...
              </Text>
            ) : null}
          </View>
        ) : (
          <Text className="text-xs italic text-[#94A3B8]">
            Standard dining order items
          </Text>
        )}
      </View>

      {/* Card Footer: Total Amount & Action Button */}
      <View className="mt-3 flex-row items-center justify-between border-t border-[#F1F5F9] pt-3">
        <View>
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
            Total Amount
          </Text>
          <Text className="text-base font-extrabold text-[#012711]">
            {formatPrice(totalAmount)}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          {isReady && onServe ? (
            <Pressable
              onPress={onServe}
              accessibilityRole="button"
              className="flex-row items-center gap-1.5 rounded-xl bg-[#116C0B] px-3.5 py-2 active:opacity-80"
            >
              <CheckCircleSvg color="#FFFFFF" size={14} />
              <Text className="text-xs font-bold text-white">Serve Table</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onPress}
            accessibilityRole="button"
            className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 active:bg-slate-50"
          >
            <Text className="text-xs font-bold text-[#334155]">Details ›</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

/* ==========================================================================
   Home Tab Content
   ========================================================================== */

function HomeTabContent({
  orders,
  foods,
  tables,
  assignedTables,
  user,
  isClockedIn,
  clockInTime,
  onOpenAttendance,
  onSelectTab,
  onSelectOrder,
  onServeOrder,
  onOpenAssignedTables,
}: {
  orders: Row[];
  foods: Row[];
  tables: ServerTable[];
  assignedTables: ServerTable[];
  user: HeaderUser;
  isClockedIn: boolean;
  clockInTime: string;
  onOpenAttendance: () => void;
  onSelectTab: (tab: ServerTab) => void;
  onSelectOrder: (order: Row) => void;
  onServeOrder: (order: Row) => void;
  onOpenAssignedTables: () => void;
}) {
  const name = user.name?.trim() || user.username?.trim() || 'Server';
  const [orderFilter, setOrderFilter] = useState<'all' | 'ready' | 'cooking' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const myOrders = useMemo(
    () => orders.filter(order => orderBelongsToUser(order, user)),
    [orders, user],
  );

  // Current time greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Filtered orders
  const activeOrders = useMemo(() => {
    return myOrders.filter(isActiveOrder);
  }, [myOrders]);

  const readyOrders = useMemo(() => {
    return activeOrders.filter(isReadyOrder);
  }, [activeOrders]);

  const cookingOrders = useMemo(() => {
    return activeOrders.filter(order => {
      const status = orderStatus(order);
      return status.includes('prepar') || status.includes('cook');
    });
  }, [activeOrders]);

  const pendingOrders = useMemo(() => {
    return activeOrders.filter(order => ['pending', 'confirmed'].includes(orderStatus(order)));
  }, [activeOrders]);

  const servedTodayCount = useMemo(() => {
    return myOrders.filter(order =>
      ['delivered', 'served', 'completed', 'paid'].some(status =>
        orderStatus(order).includes(status),
      ),
    ).length;
  }, [myOrders]);

  // Active table numbers with orders
  const occupiedTableNumbers = useMemo(() => {
    const tableSet = new Set<string>();
    activeOrders.forEach(o => {
      const t = value(o, ['table_number', 'table_id', 'table'], '');
      if (t && t !== '—') tableSet.add(String(t).trim());
    });
    return tableSet;
  }, [activeOrders]);

  // Assigned tables counts for THIS server
  const assignedTableCount = assignedTables.length;
  const assignedOccupiedCount = useMemo(() => {
    return assignedTables.filter(t => {
      const num = String(t.table_number ?? t.id ?? t.table_id ?? '').trim();
      const status = String(t.status || '').toLowerCase();
      return status === 'occupied' || occupiedTableNumbers.has(num);
    }).length;
  }, [assignedTables, occupiedTableNumbers]);

  const assignedAvailableCount = Math.max(0, assignedTableCount - assignedOccupiedCount);

  // Popular Menu Dishes: ranked by real orders frequency and popularity flags
  const popularDishes = useMemo(() => {
    const orderCountByName = new Map<string, number>();
    myOrders.forEach(order => {
      const items = getOrderItems(order);
      items.forEach(item => {
        const cleanName = String(item.name || '').toLowerCase().trim();
        const quantity = Number(item.quantity) || 1;
        if (cleanName) {
          orderCountByName.set(
            cleanName,
            (orderCountByName.get(cleanName) || 0) + quantity,
          );
        }
      });
    });

    const scoredFoods = foods
      .filter(food => {
        const foodName = getFoodName(food).trim();
        if (!foodName || foodName === 'Menu Item' || foodName === 'Dish') return false;

        const status = String(food.status || food.food_status || '').toLowerCase();
        if (status === 'inactive' || status === 'disabled' || status === 'unavailable') {
          return false;
        }

        const isAvail = food.is_available ?? food.available;
        if (isAvail === false || isAvail === 0 || isAvail === '0' || isAvail === 'false') {
          return false;
        }

        return true;
      })
      .map(food => {
        const foodName = getFoodName(food).toLowerCase().trim();
        const orderCount = orderCountByName.get(foodName) || 0;
        let score = orderCount * 15;

        const isPop = food.is_popular ?? food.popular ?? food.is_popular_dish;
        if (isPop === true || isPop === 1 || isPop === '1' || isPop === 'true') {
          score += 30;
        }

        const isBest = food.is_bestseller ?? food.bestseller ?? food.is_best_seller ?? food.best_seller;
        if (isBest === true || isBest === 1 || isBest === '1' || isBest === 'true') {
          score += 25;
        }

        const isFeatured = food.is_featured ?? food.featured;
        if (isFeatured === true || isFeatured === 1 || isFeatured === '1' || isFeatured === 'true') {
          score += 15;
        }

        const rating = Number(food.rating ?? food.stars ?? 0);
        if (!isNaN(rating) && rating > 0) {
          score += rating * 3;
        }

        if (imageValue(food)) {
          score += 10;
        }

        const price = getFoodPrice(food);
        if (price > 0) {
          score += 5;
        }

        return { food, score, orderCount };
      });

    scoredFoods.sort((a, b) => b.score - a.score);

    if (scoredFoods.length > 0) {
      return scoredFoods.slice(0, 4).map(item => ({
        ...item.food,
        _orderCount: item.orderCount,
        _isTopSeller: item.orderCount > 0 || item.score >= 25,
      }));
    }

    return foods.slice(0, 4).map(f => ({
      ...f,
      _orderCount: 0,
      _isTopSeller: false,
    }));
  }, [foods, myOrders]);

  // Filtered orders list to render
  const displayedOrders = useMemo(() => {
    let list = activeOrders;
    if (orderFilter === 'ready') list = readyOrders;
    else if (orderFilter === 'cooking') list = cookingOrders;
    else if (orderFilter === 'pending') list = pendingOrders;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(o => {
        const num = value(o, ['order_number', 'order_id', 'id'], '').toLowerCase();
        const guest = value(o, ['customer_name', 'customerName'], '').toLowerCase();
        const tbl = value(o, ['table_number', 'table_id'], '').toLowerCase();
        return num.includes(q) || guest.includes(q) || tbl.includes(q);
      });
    }
    return list;
  }, [activeOrders, readyOrders, cookingOrders, pendingOrders, orderFilter, searchQuery]);

  return (
    <View className="px-4 pb-8 pt-3">
      {/* ====================================================================
          Hero Welcome & Shift Status Banner
          ==================================================================== */}
      <View
        style={{
          backgroundColor: '#062D16',
          borderRadius: 24,
          elevation: 6,
          overflow: 'hidden',
          padding: 20,
          shadowColor: '#012711',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
        }}
      >
        {/* Background decorative glow */}
        <View
          pointerEvents="none"
          style={{
            backgroundColor: 'rgba(255, 120, 0, 0.12)',
            borderRadius: 90,
            height: 180,
            position: 'absolute',
            right: -30,
            top: -40,
            width: 180,
          }}
        />

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-[#86EFAC]" />
            <Text className="text-[11px] font-bold tracking-widest text-[#B8D7BE]">
              SERVER STATION • {currentDate.toUpperCase()}
            </Text>
          </View>
          <View className="rounded-full bg-[#114D26] px-3 py-1">
            <Text className="text-[11px] font-semibold text-[#86EFAC]">
              {isClockedIn ? 'ON SHIFT' : 'OFF SHIFT'}
            </Text>
          </View>
        </View>

        <Text className="mt-3 text-2xl font-bold text-white">
          {greeting},
        </Text>
        <Text className="text-3xl font-black text-[#FF8A00]">
          {name} 👋
        </Text>
        <Text className="mt-1 text-xs text-[#CBD5E1]">
          {isClockedIn
            ? `Shift started at ${clockInTime || 'Service Shift'}. Keep tables delighted!`
            : 'Clock in to begin logging tables and taking orders.'}
        </Text>

        {/* Quick Shift Bar Action */}
        <View className="mt-4 flex-row items-center justify-between rounded-xl bg-white/10 p-2.5 backdrop-blur-md">
          <View className="flex-row items-center gap-2">
            <View
              style={{
                backgroundColor: isClockedIn ? '#10B981' : '#F59E0B',
                borderRadius: 9999,
                height: 10,
                width: 10,
              }}
            />
            <Text className="text-xs font-semibold text-white">
              {isClockedIn ? 'Attendance Marked • Active Shift' : 'Shift Not Started'}
            </Text>
          </View>
          <Pressable
            onPress={onOpenAttendance}
            accessibilityRole="button"
            className="rounded-lg bg-[#FF7800] px-3 py-1.5 active:bg-[#EA580C]"
          >
            <Text className="text-xs font-extrabold text-white">
              {isClockedIn ? 'Shift Details' : 'Clock In Now'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ====================================================================
          Key Service Metrics (KPI Cards)
          ==================================================================== */}
      <View className="mt-5">
        <View className="flex-row gap-3">
          <StatCard
            label="Active Orders"
            value={activeOrders.length}
            subtext="In kitchen queue"
            badge="LIVE"
            tone="green"
            icon={ReceiptListSvg}
            onPress={() => setOrderFilter('all')}
          />
          <StatCard
            label="Ready to Serve"
            value={readyOrders.length}
            subtext="Food waiting for table"
            badge={readyOrders.length > 0 ? 'READY' : 'CLEAR'}
            tone="orange"
            icon={FlameSvg}
            onPress={() => setOrderFilter('ready')}
          />
        </View>

        <View className="mt-3 flex-row gap-3">
          <StatCard
            label="Assigned Tables"
            value={
              assignedTableCount > 0
                ? `${assignedTableCount} Tables`
                : '0 Tables'
            }
            subtext={
              assignedTableCount > 0
                ? `${assignedOccupiedCount} Occupied • ${assignedAvailableCount} Free`
                : 'Tap to check assigned stations'
            }
            badge="MY FLOOR"
            tone="indigo"
            icon={TableSvg}
            onPress={onOpenAssignedTables}
          />
          <StatCard
            label="Served Today"
            value={servedTodayCount}
            subtext="Delivered to guests"
            badge="DONE"
            tone="teal"
            icon={CheckCircleSvg}
          />
        </View>
      </View>

      {/* ====================================================================
          Quick Actions Grid
          ==================================================================== */}
      <View className="mt-6">
        <Text className="text-lg font-extrabold text-[#012711]">
          Quick Actions
        </Text>
        <Text className="text-xs text-[#64748B]">
          Fast access to floor tools and shift workflows
        </Text>

        <View className="mt-4 flex-row flex-wrap justify-between gap-y-4">
          {[
            {
              label: 'Floor Tables',
              desc: `${assignedTableCount} assigned to you`,
              icon: TableSvg,
              color: '#065F46',
              bg: '#ECFDF5',
              tab: 'tables' as ServerTab,
            },
            {
              label: 'Take Order / Food',
              desc: 'Browse items & stock',
              icon: UtensilsSvg,
              color: '#C2410C',
              bg: '#FFF7ED',
              tab: 'foods' as ServerTab,
            },
            {
              label: 'Kitchen Orders',
              desc: `${readyOrders.length} ready to serve`,
              icon: FlameSvg,
              color: '#B45309',
              bg: '#FEF3C7',
              tab: 'home' as ServerTab,
              onPressOverride: () => setOrderFilter('ready'),
            },
            {
              label: 'Shift & Hours',
              desc: isClockedIn ? 'Clocked in' : 'Mark attendance',
              icon: ClockSvg,
              color: '#4338CA',
              bg: '#EEF2FF',
              tab: 'attendee' as ServerTab,
            },
          ].map(action => {
            const Icon = action.icon;
            return (
              <Pressable
                key={action.label}
                onPress={() => {
                  if (action.onPressOverride) action.onPressOverride();
                  else onSelectTab(action.tab);
                }}
                accessibilityRole="button"
                style={{
                  backgroundColor: action.bg,
                  borderRadius: 18,
                  elevation: 1,
                  padding: 14,
                  width: '48.5%',
                }}
              >
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    height: 38,
                    justifyContent: 'center',
                    width: 38,
                  }}
                >
                  <Icon color={action.color} size={20} />
                </View>
                <Text
                  style={{
                    color: '#0F172A',
                    fontSize: 14,
                    fontWeight: '800',
                    marginTop: 10,
                  }}
                >
                  {action.label}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: '#64748B',
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  {action.desc}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ====================================================================
          Active Orders Stream
          ==================================================================== */}
      <View className="mt-8">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-extrabold text-[#012711]">
              Live Orders
            </Text>
            <Text className="text-xs text-[#64748B]">
              Real-time kitchen and dining orders
            </Text>
          </View>
          <View className="rounded-full bg-[#FFF0DE] px-3 py-1">
            <Text className="text-xs font-bold text-[#C2410C]">
              {activeOrders.length} Active
            </Text>
          </View>
        </View>

        {/* Search input */}
        <View className="mt-3.5 flex-row items-center rounded-xl border border-[#CBD5E1] bg-white px-3 py-2.5">
          <SearchSvg color="#64748B" size={18} />
          <TextInput
            placeholder="Search order #, table #, or guest name..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="ml-2 flex-1 text-sm text-[#0F172A]"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} className="p-1">
              <CloseSvg color="#64748B" size={16} />
            </Pressable>
          ) : null}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3 py-1"
        >
          <View className="flex-row gap-2">
            {[
              { id: 'all', label: `All Active (${activeOrders.length})` },
              { id: 'ready', label: `Ready to Serve (${readyOrders.length})`, highlight: readyOrders.length > 0 },
              { id: 'cooking', label: `In Kitchen (${cookingOrders.length})` },
              { id: 'pending', label: `Pending (${pendingOrders.length})` },
            ].map(f => {
              const isSelected = orderFilter === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setOrderFilter(f.id as typeof orderFilter)}
                  style={{
                    backgroundColor: isSelected
                      ? '#116C0B'
                      : f.highlight
                      ? '#FEF3C7'
                      : '#FFFFFF',
                    borderColor: isSelected
                      ? '#116C0B'
                      : f.highlight
                      ? '#F59E0B'
                      : '#E2E8F0',
                    borderRadius: 9999,
                    borderWidth: 1,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                  }}
                >
                  <Text
                    style={{
                      color: isSelected
                        ? '#FFFFFF'
                        : f.highlight
                        ? '#B45309'
                        : '#475569',
                      fontSize: 12,
                      fontWeight: isSelected || f.highlight ? '700' : '500',
                    }}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Order Cards List */}
        <View className="mt-3">
          {displayedOrders.length > 0 ? (
            displayedOrders.map((order, idx) => (
              <OrderCard
                key={`${value(order, ['id', 'order_id'], String(idx))}-${idx}`}
                order={order}
                onPress={() => onSelectOrder(order)}
                onServe={() => onServeOrder(order)}
              />
            ))
          ) : (
            <View className="items-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-8">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-[#F0FDF4]">
                <CheckCircleSvg color="#15803D" size={28} />
              </View>
              <Text className="mt-3 text-base font-bold text-[#0F172A]">
                No orders in this category
              </Text>
              <Text className="mt-1 text-center text-xs text-[#64748B]">
                {searchQuery
                  ? 'No orders matched your search query.'
                  : 'All orders in this view are completed or no orders have been placed yet.'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ====================================================================
          Popular Menu Dishes Preview
          ==================================================================== */}
      <View className="mt-7">
        <View className="flex-row items-center justify-between">
          <View>
            <View className="flex-row items-center gap-1.5">
              <SparklesSvg color="#EA580C" size={18} />
              <Text className="text-xl font-extrabold text-[#012711]">
                Popular Menu Dishes
              </Text>
            </View>
            <Text className="mt-0.5 text-xs text-[#64748B]">
              Top ordered & chef recommended dishes
            </Text>
          </View>
          <Pressable
            accessibilityLabel="View full menu"
            accessibilityRole="button"
            onPress={() => onSelectTab('foods')}
            className="rounded-lg bg-[#FFF7ED] px-3 py-1.5 active:bg-[#FFEDD5]"
          >
            <Text className="text-xs font-bold text-[#EA580C]">
              Full Menu ›
            </Text>
          </Pressable>
        </View>

        <View className="mt-3 flex-row flex-wrap justify-between gap-y-3">
          {popularDishes.map((food, idx) => {
            const foodName = getFoodName(food);
            const category = getFoodCategory(food);
            const price = getFoodPrice(food);
            const image = imageValue(food);
            const type = getFoodType(food);
            const orderCount = ((food as Record<string, unknown>)._orderCount as number) || 0;
            const isTopSeller = Boolean((food as Record<string, unknown>)._isTopSeller);

            return (
              <Pressable
                key={`${foodName}-${idx}`}
                accessibilityLabel={`View ${foodName} in the full menu`}
                accessibilityRole="button"
                onPress={() => onSelectTab('foods')}
                style={({ pressed }) => ({
                  backgroundColor: '#FFFFFF',
                  borderColor: pressed ? '#5FAF68' : '#B8D8BD',
                  borderRadius: 20,
                  borderWidth: 1.5,
                  elevation: 8,
                  opacity: pressed ? 0.9 : 1,
                  shadowColor: '#14532D',
                  shadowOffset: { width: 0, height: 5 },
                  shadowOpacity: pressed ? 0.12 : 0.2,
                  shadowRadius: 12,
                  width: '48.5%',
                })}
              >
                {/* Image Container with Badges */}
                <View className="relative h-32 w-full overflow-hidden rounded-t-[18px] bg-[#F1F5F9]">
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      resizeMode="cover"
                      className="h-full w-full"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-[#F8FAFC]">
                      <UtensilsSvg color="#94A3B8" size={26} />
                    </View>
                  )}

                  {/* Veg / Non-Veg Icon Top Left */}
                  <View className="absolute left-2.5 top-2.5 rounded-lg bg-white/95 p-1.5 shadow-sm">
                    {type === 'veg' ? <VegDotSvg size={12} /> : <NonVegDotSvg size={12} />}
                  </View>

                  {/* Popularity Badge Top Right */}
                  <View className="absolute right-2.5 top-2.5 rounded-full bg-[#062D16]/95 px-2.5 py-1">
                    <Text className="text-[9px] font-black text-[#D1FAE5]">
                      {orderCount > 0
                        ? `🔥 ${orderCount} Orders`
                        : isTopSeller
                        ? '★ Top Seller'
                        : '★ 4.8'}
                    </Text>
                  </View>
                </View>

                {/* Card Body */}
                <View className="p-3.5">
                  <View className="self-start rounded-full bg-[#FFF7ED] px-2.5 py-1">
                    <Text
                      numberOfLines={1}
                      className="text-[9px] font-extrabold uppercase tracking-wide text-[#C2410C]"
                    >
                      {category}
                    </Text>
                  </View>

                  <Text
                    numberOfLines={1}
                    className="mt-2 text-sm font-black text-[#0F172A]"
                  >
                    {foodName}
                  </Text>

                  <View className="mt-3 flex-row items-center justify-between">
                    <Text className="text-base font-black text-[#116C0B]">
                      {formatPrice(price)}
                    </Text>
                    <View className="flex-row items-center rounded-xl bg-[#F0FDF4] px-2.5 py-1.5">
                      <Text className="text-[10px] font-extrabold text-[#15803D]">
                        View menu
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ==========================================================================
   Tables Tab Content
   ========================================================================== */

function TablesTabContent({
  tables,
  orders,
  onSelectTable,
  user,
}: {
  tables: ServerTable[];
  orders: Row[];
  onSelectTable: (tableNum: string) => void;
  user: HeaderUser;
}) {
  const [filter, setFilter] = useState<'all' | 'available' | 'occupied'>('all');
  const [search, setSearch] = useState('');

  // Map occupied table numbers from active orders
  const occupiedMap = useMemo(() => {
    const map = new Map<string, Row>();
    orders.forEach(order => {
      const status = value(order, ['status', 'order_status'], '').toLowerCase();
      if (['pending', 'preparing', 'cooking', 'ready', 'confirmed'].includes(status)) {
        const tbl = value(order, ['table_number', 'table_id', 'table'], '');
        if (tbl && tbl !== '—') {
          map.set(String(tbl).trim(), order);
        }
      }
    });
    return map;
  }, [orders]);

  // Normalize table records or build fallback floor map
  const tableList = useMemo(() => {
    const currentEmployeeId = user.employee_id ?? user.employeeId;
    const assignedTables = tables.filter(table => {
      const assignedId =
        table.assigned_server_id ??
        table.assigned_employee_id ??
        table.server_id;
      if (assignedId === null || assignedId === undefined || assignedId === '') {
        return false;
      }
      if (currentEmployeeId === undefined || currentEmployeeId === null) {
        return true;
      }
      return String(assignedId) === String(currentEmployeeId);
    });

    return assignedTables.map(t => {
      const num = String(t.table_number || t.id || t.table_id || '');
      const isOccupied =
        occupiedMap.has(num) || (t.status || '').toLowerCase() === 'occupied';
      return {
        id: num,
        number: num,
        seats: Number(t.no_of_seats || 4),
        status: isOccupied ? 'Occupied' : 'Available',
        activeOrder: occupiedMap.get(num),
      };
    });
  }, [tables, occupiedMap, user]);

  const availableCount = tableList.filter(t => t.status === 'Available').length;
  const occupiedCount = tableList.filter(t => t.status === 'Occupied').length;

  const displayedTables = useMemo(() => {
    let list = tableList;
    if (filter === 'available') list = list.filter(t => t.status === 'Available');
    if (filter === 'occupied') list = list.filter(t => t.status === 'Occupied');
    if (search.trim()) {
      list = list.filter(t => t.number.toLowerCase().includes(search.toLowerCase().trim()));
    }
    return list;
  }, [tableList, filter, search]);

  return (
    <View className="px-4 pb-12 pt-3">
      {/* Floor Overview Card */}
      <View
        style={{
          backgroundColor: '#062D16',
          borderRadius: 22,
          padding: 18,
        }}
      >
        <Text className="text-xs font-bold tracking-widest text-[#B8D7BE]">
          RESTAURANT FLOOR MAP
        </Text>
        <Text className="mt-1 text-2xl font-black text-white">
          Table Seating
        </Text>
        <Text className="text-xs text-[#CBD5E1]">
          Monitor table occupancy and guest turnaround
        </Text>

        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 rounded-xl bg-white/10 p-3">
            <Text className="text-xs font-semibold text-[#86EFAC]">Available</Text>
            <Text className="text-2xl font-extrabold text-white">{availableCount}</Text>
          </View>
          <View className="flex-1 rounded-xl bg-white/10 p-3">
            <Text className="text-xs font-semibold text-[#FDBA74]">Occupied</Text>
            <Text className="text-2xl font-extrabold text-white">{occupiedCount}</Text>
          </View>
          <View className="flex-1 rounded-xl bg-white/10 p-3">
            <Text className="text-xs font-semibold text-[#CBD5E1]">Total</Text>
            <Text className="text-2xl font-extrabold text-white">{tableList.length}</Text>
          </View>
        </View>
      </View>

      {/* Filter and Search Bar */}
      <View className="mt-4 flex-row items-center gap-2">
        <View className="flex-1 flex-row items-center rounded-xl border border-[#CBD5E1] bg-white px-3 py-2">
          <SearchSvg size={16} />
          <TextInput
            placeholder="Search table number..."
            value={search}
            onChangeText={setSearch}
            className="ml-2 flex-1 text-xs text-[#0F172A]"
          />
        </View>
      </View>

      <View className="mt-3 flex-row gap-2">
        {[
          { id: 'all', label: `All (${tableList.length})` },
          { id: 'available', label: `Available (${availableCount})` },
          { id: 'occupied', label: `Occupied (${occupiedCount})` },
        ].map(f => (
          <Pressable
            key={f.id}
            onPress={() => setFilter(f.id as typeof filter)}
            style={{
              backgroundColor: filter === f.id ? '#116C0B' : '#FFFFFF',
              borderColor: filter === f.id ? '#116C0B' : '#E2E8F0',
              borderRadius: 9999,
              borderWidth: 1,
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                color: filter === f.id ? '#FFFFFF' : '#475569',
                fontSize: 12,
                fontWeight: filter === f.id ? '700' : '500',
              }}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Table Grid */}
      <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
        {displayedTables.map(table => {
          const isOcc = table.status === 'Occupied';
          return (
            <Pressable
              key={table.id}
              onPress={() => onSelectTable(table.number)}
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: isOcc ? '#F97316' : '#86EFAC',
                borderRadius: 18,
                borderWidth: 1.5,
                elevation: 2,
                padding: 14,
                width: '48.5%',
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <TableSvg color={isOcc ? '#EA580C' : '#15803D'} size={18} />
                  <Text className="text-base font-extrabold text-[#0F172A]">
                    T-{table.number}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: isOcc ? '#FFF7ED' : '#F0FDF4',
                    borderRadius: 9999,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    style={{
                      color: isOcc ? '#C2410C' : '#15803D',
                      fontSize: 10,
                      fontWeight: '800',
                    }}
                  >
                    {table.status}
                  </Text>
                </View>
              </View>

              <View className="mt-3 flex-row items-center gap-1.5">
                <UsersSvg color="#64748B" size={14} />
                <Text className="text-xs text-[#64748B]">
                  {table.seats} Seats capacity
                </Text>
              </View>

              {isOcc && table.activeOrder ? (
                <View className="mt-3 rounded-lg bg-[#FFF7ED] p-2">
                  <Text numberOfLines={1} className="text-[11px] font-bold text-[#EA580C]">
                    {value(table.activeOrder, ['order_number', 'order_id'], 'Active Order')}
                  </Text>
                  <Text className="text-[10px] text-[#64748B]">
                    {value(table.activeOrder, ['customer_name'], 'Guest seated')}
                  </Text>
                </View>
              ) : (
                <View className="mt-3 rounded-lg bg-[#F8FAFC] p-2">
                  <Text className="text-[11px] text-[#94A3B8]">
                    Ready to seat guests
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ==========================================================================
   Foods Tab Content
   ========================================================================== */

function FoodsTabContent({ foods }: { foods: Row[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [query, setQuery] = useState('');

  const categories = useMemo(() => {
    const set = new Set<string>();
    foods.forEach(f => {
      const c = value(f, ['category_name', 'category'], '');
      if (c && c !== '—') set.add(c);
    });
    return ['All', ...Array.from(set)];
  }, [foods]);

  const displayedFoods = useMemo(() => {
    let list = foods;
    if (selectedCategory !== 'All') {
      list = list.filter(
        f => value(f, ['category_name', 'category'], '') === selectedCategory,
      );
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(f => {
        const name = value(f, ['food_name', 'product_name', 'name'], '').toLowerCase();
        return name.includes(q);
      });
    }
    return list;
  }, [foods, selectedCategory, query]);

  return (
    <View className="px-4 pb-12 pt-3">
      {/* Search Header */}
      <View
        style={{
          backgroundColor: '#062D16',
          borderRadius: 22,
          padding: 18,
        }}
      >
        <Text className="text-xs font-bold tracking-widest text-[#B8D7BE]">
          RESTAURANT MENU & INVENTORY
        </Text>
        <Text className="mt-1 text-2xl font-black text-white">
          Food Catalog
        </Text>
        <Text className="text-xs text-[#CBD5E1]">
          Browse dish prices, categories, and availability
        </Text>

        <View className="mt-3.5 flex-row items-center rounded-xl bg-white px-3 py-2.5">
          <SearchSvg size={18} />
          <TextInput
            placeholder="Search dish or beverage..."
            value={query}
            onChangeText={setQuery}
            className="ml-2 flex-1 text-sm text-[#0F172A]"
          />
        </View>
      </View>

      {/* Category Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
        <View className="flex-row gap-2">
          {categories.map(cat => (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={{
                backgroundColor: selectedCategory === cat ? '#116C0B' : '#FFFFFF',
                borderColor: selectedCategory === cat ? '#116C0B' : '#E2E8F0',
                borderRadius: 9999,
                borderWidth: 1,
                paddingHorizontal: 14,
                paddingVertical: 7,
              }}
            >
              <Text
                style={{
                  color: selectedCategory === cat ? '#FFFFFF' : '#475569',
                  fontSize: 12,
                  fontWeight: selectedCategory === cat ? '700' : '500',
                }}
              >
                {cat}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Food Cards */}
      <View className="mt-4 gap-3">
        {displayedFoods.length > 0 ? (
          displayedFoods.map((food, idx) => {
            const name = value(food, ['food_name', 'product_name', 'name'], 'Dish');
            const category = value(food, ['category_name', 'category'], 'Menu item');
            const price = value(food, ['price', 'selling_price', 'unit_price'], '0');

            return (
              <View
                key={`${name}-${idx}`}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: 16,
                  borderWidth: 1,
                  elevation: 1,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  padding: 14,
                }}
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2">
                    <View className="rounded-md bg-[#FFF7ED] px-2 py-0.5">
                      <Text className="text-[10px] font-bold text-[#EA580C]">
                        {category}
                      </Text>
                    </View>
                    <View className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                    <Text className="text-[11px] font-semibold text-[#10B981]">
                      Available
                    </Text>
                  </View>
                  <Text className="mt-1.5 text-base font-bold text-[#0F172A]">
                    {name}
                  </Text>
                </View>

                <View className="items-end justify-center">
                  <Text className="text-base font-extrabold text-[#116C0B]">
                    {formatPrice(price)}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <View className="items-center rounded-2xl bg-white p-8">
            <Text className="text-sm font-semibold text-[#64748B]">
              No menu items match your search.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/* ==========================================================================
   Attendee Tab Content
   ========================================================================== */

function AttendeeTabContent({
  user,
  isClockedIn,
  clockInTime,
  isClockingIn,
  onClockIn,
  onClockOut,
}: {
  user: HeaderUser;
  isClockedIn: boolean;
  clockInTime: string;
  isClockingIn: boolean;
  onClockIn: () => Promise<void>;
  onClockOut: () => Promise<void>;
}) {
  const name = user.name?.trim() || user.username?.trim() || 'Team Member';
  const role = user.role || 'Restaurant Server';
  const employeeId = user.employee_id ?? user.employeeId ?? 'EMP-100';

  return (
    <View className="px-4 pb-12 pt-3">
      {/* Shift Card */}
      <View
        style={{
          backgroundColor: '#062D16',
          borderRadius: 24,
          elevation: 6,
          padding: 20,
        }}
      >
        <Text className="text-xs font-bold tracking-widest text-[#B8D7BE]">
          SERVER ATTENDANCE & SHIFT
        </Text>
        <Text className="mt-1 text-2xl font-black text-white">
          Shift Tracker
        </Text>
        <Text className="text-xs text-[#CBD5E1]">
          Log your check-in and check-out times accurately
        </Text>

        <View className="mt-5 rounded-2xl bg-white/10 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-[#CBD5E1]">Current Shift State</Text>
            <View
              style={{
                backgroundColor: isClockedIn ? '#10B981' : '#F59E0B',
                borderRadius: 9999,
                paddingHorizontal: 10,
                paddingVertical: 3,
              }}
            >
              <Text className="text-xs font-bold text-white">
                {isClockedIn ? 'CLOCKED IN' : 'NOT CLOCKED IN'}
              </Text>
            </View>
          </View>

          <View className="mt-3 flex-row items-center justify-between border-t border-white/10 pt-3">
            <Text className="text-xs text-[#CBD5E1]">Clock-In Time</Text>
            <Text className="text-sm font-bold text-white">
              {isClockedIn ? clockInTime || 'Service Shift' : '—'}
            </Text>
          </View>
        </View>

        {/* Big Action Button */}
        {isClockedIn ? (
          <Pressable
            onPress={() => {
              Alert.alert('Clock Out', 'Are you sure you want to clock out for the day?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clock Out',
                  style: 'destructive',
                  onPress: () => void onClockOut(),
                },
              ]);
            }}
            accessibilityRole="button"
            className="mt-5 h-12 items-center justify-center rounded-xl bg-[#DC2626] active:bg-[#B91C1C]"
          >
            <Text className="font-extrabold text-white">Clock Out & End Shift</Text>
          </Pressable>
        ) : (
          <Pressable
            disabled={isClockingIn}
            onPress={() => void onClockIn()}
            accessibilityRole="button"
            className="mt-5 h-12 items-center justify-center rounded-xl bg-[#FF7800] active:bg-[#EA580C]"
          >
            {isClockingIn ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="font-extrabold text-white">Clock In For Today</Text>
            )}
          </Pressable>
        )}
      </View>

      {/* Staff Profile Information */}
      <View className="mt-5 rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <Text className="text-base font-extrabold text-[#012711]">
          Staff Profile Details
        </Text>
        <View className="mt-3 gap-2.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-[#64748B]">Staff Name</Text>
            <Text className="text-xs font-bold text-[#0F172A]">{name}</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-[#64748B]">Employee ID</Text>
            <Text className="text-xs font-bold text-[#0F172A]">{String(employeeId)}</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-[#64748B]">Designation</Text>
            <Text className="text-xs font-bold text-[#0F172A]">{role}</Text>
          </View>
        </View>
      </View>

      {/* Server Service Best Practices */}
      <View className="mt-4 rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <Text className="text-base font-extrabold text-[#012711]">
          Daily Server Checklist
        </Text>
        <View className="mt-3 gap-2">
          {[
            'Greet guests within 2 minutes of seating',
            'Double-check kitchen tickets before serving tables',
            'Notify manager of any customer requests or delays',
            'Ensure table sanitizer and water are refreshed',
          ].map((item, idx) => (
            <View key={idx} className="flex-row items-center gap-2">
              <CheckCircleSvg color="#116C0B" size={16} />
              <Text className="flex-1 text-xs text-[#475569]">{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ==========================================================================
   More Tab Content
   ========================================================================== */

function MoreTabContent({
  user,
  onLogout,
  onRefresh,
  onOpenShift,
}: {
  user: HeaderUser;
  onLogout: () => void;
  onRefresh: () => void;
  onOpenShift: () => void;
}) {
  const name = user.name?.trim() || user.username?.trim() || 'Server';
  const email = user.email?.trim() || 'server@restaurant.com';

  return (
    <View className="px-4 pb-12 pt-3">
      {/* Profile Card */}
      <View className="items-center rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-[#116C0B]">
          <Text className="text-2xl font-black text-white">
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="mt-3 text-lg font-bold text-[#012711]">{name}</Text>
        <Text className="text-xs text-[#64748B]">{email}</Text>
        <View className="mt-2 rounded-full bg-[#F0FDF4] px-3 py-1">
          <Text className="text-xs font-bold text-[#15803D]">Restaurant Server</Text>
        </View>
      </View>

      {/* Workspace Actions */}
      <View className="mt-5 rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <Text className="px-2 text-xs font-bold tracking-wider text-[#94A3B8]">
          WORKSPACE SETTINGS
        </Text>

        <Pressable
          onPress={onRefresh}
          className="mt-2 flex-row items-center justify-between rounded-xl p-3 active:bg-slate-50"
        >
          <Text className="text-sm font-semibold text-[#0F172A]">
            🔄 Sync & Refresh Workspace
          </Text>
          <Text className="text-xs text-[#94A3B8]">›</Text>
        </Pressable>

        <Pressable
          onPress={() => Alert.alert('App Version', 'Restaurant Server App v1.2.0')}
          className="flex-row items-center justify-between rounded-xl p-3 active:bg-slate-50"
        >
          <Text className="text-sm font-semibold text-[#0F172A]">
            ℹ️ App Information
          </Text>
          <Text className="text-xs text-[#94A3B8]">v1.2.0 ›</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Open Shift and Hours"
          accessibilityRole="button"
          onPress={onOpenShift}
          className="flex-row items-center justify-between rounded-xl p-3 active:bg-slate-50"
        >
          <View>
            <Text className="text-sm font-semibold text-[#0F172A]">
              🕘 Shift &amp; Hours
            </Text>
            <Text className="mt-1 text-xs text-[#64748B]">
              View attendance and shift details
            </Text>
          </View>
          <Text className="text-xs text-[#94A3B8]">›</Text>
        </Pressable>
      </View>

      {/* Logout Button */}
      <Pressable
        onPress={() => {
          Alert.alert('Logout', 'Are you sure you want to log out of the server app?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: onLogout },
          ]);
        }}
        accessibilityRole="button"
        className="mt-5 h-12 items-center justify-center rounded-xl bg-[#FEF2F2] active:bg-[#FEE2E2]"
      >
        <Text className="font-extrabold text-[#DC2626]">Log Out</Text>
      </Pressable>
    </View>
  );
}

/* ==========================================================================
   Order Details Modal
   ========================================================================== */

function OrderDetailsModal({
  order,
  onClose,
  onServe,
}: {
  order: Row | null;
  onClose: () => void;
  onServe: (order: Row) => void;
}) {
  if (!order) return null;

  const orderNumber = value(order, ['order_number', 'order_id', 'id'], '#ORD');
  const tableNum = value(order, ['table_number', 'table'], 'Takeout');
  const customerName = value(order, ['customer_name', 'customerName', 'customer'], 'Guest');
  const status = value(order, ['status', 'order_status'], 'Pending');
  const totalAmount = value(order, ['total_amount', 'grand_total', 'amount'], '0');
  const items = getOrderItems(order);
  const isReady = ['ready', 'prepared', 'cooked'].includes(status.toLowerCase());

  return (
    <DetailsModal
      visible={order !== null}
      onClose={onClose}
      title={`Order • ${orderNumber}`}
      subtitle={`Table: ${tableNum} • Guest: ${customerName}`}
      badge={{
        label: status,
        bg: isReady ? '#F0FDF4' : '#FEF3C7',
        text: isReady ? '#15803D' : '#D97706',
        border: isReady ? '#DCFCE7' : '#FDE68A',
      }}
      footer={
        <View className="w-full flex-row gap-3">
          <Pressable
            onPress={onClose}
            className="min-h-12 flex-1 items-center justify-center rounded-2xl border border-[#CBD5E1] bg-white active:bg-gray-100"
          >
            <Text className="text-sm font-semibold text-[#334155]">Close</Text>
          </Pressable>
          {isReady ? (
            <Pressable
              onPress={() => {
                onServe(order);
                onClose();
              }}
              className="min-h-12 flex-1 items-center justify-center rounded-2xl bg-[#116C0B] active:bg-[#0e5809]"
            >
              <Text className="text-sm font-bold text-white">Serve Table Now</Text>
            </Pressable>
          ) : null}
        </View>
      }
    >
      <View className="gap-3">
        {/* Ordered Items */}
        <View className="gap-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
            Ordered Items ({items.length})
          </Text>
          {items.map((item, idx) => (
            <View
              key={`${item.name}-${idx}`}
              className="rounded-2xl border border-[#F1F5F9] bg-[#F8FAFC] p-3.5"
            >
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-sm font-bold text-[#0F172A]">
                  {item.quantity}x {item.name}
                </Text>
                <Text className="text-sm font-extrabold text-[#116C0B]">
                  {formatPrice(item.price * item.quantity)}
                </Text>
              </View>
              {item.notes ? (
                <Text className="mt-1 text-xs text-[#DC2626]">
                  Note: {item.notes}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* Grand Total */}
        <View className="flex-row items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <Text className="text-sm font-bold text-[#64748B]">Grand Total</Text>
          <Text className="text-xl font-black text-[#012711]">
            {formatPrice(totalAmount)}
          </Text>
        </View>
      </View>
    </DetailsModal>
  );
}

/* ==========================================================================
   Main ServerHome Component
   ========================================================================== */

export default function ServerHome({
  user,
  onLogout,
}: {
  user: HeaderUser;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ServerTab>('home');
  const [orders, setOrders] = useState<Row[]>([]);
  const [foods, setFoods] = useState<Row[]>([]);
  const [tables, setTables] = useState<ServerTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Attendance states
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(true);
  const [clockInTime, setClockInTime] = useState('09:00 AM');
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');

  // Selected order details modal
  const [selectedOrder, setSelectedOrder] = useState<Row | null>(null);
  const [selectedTable, setSelectedTable] = useState<ServerOrderTable | null>(null);
  const [isAssignedTablesOpen, setIsAssignedTablesOpen] = useState(false);
  const [storedEmployeeId, setStoredEmployeeId] = useState<string | number | null>(null);
  const [serverEmployeeId, setServerEmployeeId] = useState<string | number | null>(null);

  // Active table numbers with active orders
  const occupiedTableNumbers = useMemo(() => {
    const tableSet = new Set<string>();
    orders.forEach(o => {
      const status = String(o.status || o.order_status || '').toLowerCase();
      if (['pending', 'preparing', 'cooking', 'ready', 'confirmed'].includes(status)) {
        const t = value(o, ['table_number', 'table_id', 'table'], '');
        if (t && t !== '—') tableSet.add(String(t).trim());
      }
    });
    return tableSet;
  }, [orders]);

  const assignedTables = useMemo(() => {
    const effectiveEmpId = serverEmployeeId ?? storedEmployeeId;
    // 1. Tables specifically assigned to this server
    const serverAssigned = tables.filter(table =>
      isTableAssignedToServer(table, user, effectiveEmpId),
    );

    if (serverAssigned.length > 0) {
      return serverAssigned;
    }

    // 2. Check if ANY table in restaurant has an assignment to anyone
    const anyAssignmentExists = tables.some(t => {
      const aId =
        t.assigned_server_id ??
        t.assigned_employee_id ??
        t.server_id ??
        (t as Record<string, unknown>).employee_id ??
        (t as Record<string, unknown>).user_id ??
        (t as Record<string, unknown>).assigned_to;
      return aId !== null && aId !== undefined && String(aId).trim() !== '';
    });

    // If tables ARE assigned in restaurant, but none to this server, return []
    if (anyAssignmentExists) {
      return [];
    }

    // 3. Fallback: If restaurant has not assigned tables to ANY server yet (unassigned demo / floor),
    // default to the first 4 tables so the server has floor tables to work with!
    return tables.slice(0, 4);
  }, [tables, user, storedEmployeeId, serverEmployeeId]);

  const loadHome = useCallback(async () => {
    let activeEmpId: string | number | null =
      (user?.employee_id as string | number | null) ??
      (user?.employeeId as string | number | null) ??
      (((user as Record<string, unknown>)?.emp_id as unknown) as string | number | null) ??
      null;

    try {
      const stored = await getStoredUser();
      const sId = (activeEmpId ??
        stored?.employee_id ??
        stored?.employeeId ??
        ((stored as Record<string, unknown>)?.emp_id as unknown)) as string | number | null;
      if (sId) {
        setStoredEmployeeId(sId);
        activeEmpId = sId;
      }
    } catch {
      // ignore
    }

    const [orderResult, foodResult, tableResult, empResult] = await Promise.allSettled([
      api.get('/kitchen-orders'),
      api.get('/foods'),
      api.get('/server-tables'),
      api.get('/employees'),
    ]);

    const loadedTables =
      tableResult.status === 'fulfilled'
        ? (rows(tableResult.value.data) as ServerTable[])
        : [];

    const empList =
      empResult.status === 'fulfilled'
        ? (rows(empResult.value.data) as Record<string, unknown>[])
        : [];

    // Resolve canonical employee ID using comprehensive multi-vector matcher
    const realId = resolveServerEmployeeId(empList, user, loadedTables);
    if (realId) {
      setStoredEmployeeId(realId);
      setServerEmployeeId(realId);
    } else if (activeEmpId) {
      setServerEmployeeId(activeEmpId);
    }

    const loadedOrders =
      orderResult.status === 'fulfilled' ? rows(orderResult.value.data) : [];
    setOrders(loadedOrders.filter(isTodayOrder));
    setFoods(
      foodResult.status === 'fulfilled' ? rows(foodResult.value.data) : [],
    );
    setTables(loadedTables);
  }, [user]);

  const initData = useCallback(async () => {
    setLoading(true);
    await loadHome();
    setLoading(false);
  }, [loadHome]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHome();
    setRefreshing(false);
  }, [loadHome]);

  useEffect(() => {
    void initData();
  }, [initData]);

  const clockIn = useCallback(async () => {
    setIsClockingIn(true);
    setAttendanceError('');
    try {
      const employeeId = user.employee_id ?? user.employeeId;
      const payload = employeeId === undefined ? {} : { employee_id: employeeId };
      await api.post('/attendance/clock-in', payload);
      setIsClockedIn(true);
      setClockInTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      );
      setIsAttendanceOpen(false);
      Alert.alert('Shift Started', 'You are now clocked in for service.');
    } catch (error) {
      setAttendanceError(
        error instanceof Error
          ? error.message
          : 'Unable to clock in. Please try again.',
      );
    } finally {
      setIsClockingIn(false);
    }
  }, [user]);

  const clockOut = useCallback(async () => {
    try {
      const employeeId = user.employee_id ?? user.employeeId;
      const payload = employeeId === undefined ? {} : { employee_id: employeeId };
      await api.post('/attendance/clock-out', payload);
      setIsClockedIn(false);
      await onLogout();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to check out. Please try again.';
      Alert.alert('Check out failed', message);
    }
  }, [onLogout, user]);

  const handleServeOrder = useCallback(
    async (order: Row) => {
      const orderId = value(order, ['order_id', 'id'], '');
      if (!orderId) return;

      // Optimistic update
      setOrders(current =>
        current.map(o => {
          if (value(o, ['order_id', 'id'], '') === orderId) {
            return { ...o, status: 'served', order_status: 'served' };
          }
          return o;
        }),
      );

      try {
        await api
          .put(`/orders/management/${orderId}`, { status: 'served' })
          .catch(async () => {
            return await api
              .patch(`/orders/${orderId}/status`, { status: 'served' })
              .catch(async () => {
                return await api.put(`/orders/${orderId}`, {
                  order_status: 'served',
                });
              });
          });
      } catch {
        // Fallback silently if API format differs
      }
    },
    [],
  );

  const openTableOrder = useCallback(
    async (table: ServerTable) => {
      const tableId = table.table_id ?? table.id;
      if (tableId === undefined || tableId === null) {
        Alert.alert('Table unavailable', 'This table does not have a valid ID.');
        return;
      }

      setIsAssignedTablesOpen(false);
      setSelectedTable({
        ...table,
        id: tableId,
        table_id: tableId,
        status: table.status || 'occupied',
      });
    },
    [],
  );

  const mainContent = useMemo(() => {
    if (loading) {
      return (
        <View className="items-center justify-center py-24">
          <ActivityIndicator size="large" color="#FF7800" />
          <Text className="mt-3 text-sm font-semibold text-[#64748B]">
            Loading restaurant workspace...
          </Text>
        </View>
      );
    }

    if (selectedTable) {
      return (
        <ServerItems
          table={selectedTable}
          tables={assignedTables.length > 0 ? assignedTables : tables.slice(0, 8)}
          user={user}
          serverEmployeeId={serverEmployeeId ?? storedEmployeeId}
          onBack={() => setSelectedTable(null)}
          onTableChange={table => {
            void openTableOrder(table);
          }}
          onTableStatusChange={status => {
            setSelectedTable(current =>
              current ? { ...current, status } : current,
            );
            setTables(current =>
              current.map(item =>
                String(item.id ?? item.table_id) ===
                String(selectedTable.id ?? selectedTable.table_id)
                  ? { ...item, status }
                  : item,
              ),
            );
          }}
        />
      );
    }

    if (activeTab === 'home') {
      return (
        <HomeTabContent
          orders={orders}
          foods={foods}
          tables={tables}
          assignedTables={assignedTables}
          user={user}
          isClockedIn={isClockedIn}
          clockInTime={clockInTime}
          onOpenAttendance={() => setIsAttendanceOpen(true)}
          onSelectTab={setActiveTab}
          onSelectOrder={setSelectedOrder}
          onServeOrder={handleServeOrder}
          onOpenAssignedTables={() => setIsAssignedTablesOpen(true)}
        />
      );
    }

    if (activeTab === 'tables') {
      return (
        <ServerTables
          tables={tables}
          user={user}
          serverEmployeeId={serverEmployeeId ?? storedEmployeeId}
          orders={orders}
          onRefresh={onRefresh}
          onSelectTable={tableNumber => {
            const table =
              assignedTables.find(
                item =>
                  String(item.table_number ?? item.id ?? item.table_id) === tableNumber,
              ) ??
              tables.find(
                item =>
                  String(item.table_number ?? item.id ?? item.table_id) === tableNumber,
              );
            if (table) {
              void openTableOrder(table);
            }
          }}
        />
      );
    }

    if (activeTab === 'orders') {
      return (
        <ServerOrders
          user={user}
          serverEmployeeId={serverEmployeeId ?? storedEmployeeId}
        />
      );
    }

    if (activeTab === 'foods') {
      return <ServerFoods />;
    }

    if (activeTab === 'attendee') {
      return (
        <AttendeeTabContent
          user={user}
          isClockedIn={isClockedIn}
          clockInTime={clockInTime}
          isClockingIn={isClockingIn}
          onClockIn={clockIn}
          onClockOut={clockOut}
        />
      );
    }

    if (activeTab === 'profile') {
      return (
        <ServerProfile
          user={user}
          onBack={() => setActiveTab('home')}
          onLogout={onLogout}
          onClockOut={clockOut}
        />
      );
    }

    return (
      <ServerMore
        user={user}
        onLogout={onLogout}
        onClockOut={clockOut}
        onRefreshWorkspace={onRefresh}
        onOpenProfile={() => setActiveTab('profile')}
        onOpenFoods={() => setActiveTab('foods')}
        onOpenOrders={() => setActiveTab('orders')}
      />
    );
  }, [
    activeTab,
    clockIn,
    clockInTime,
    clockOut,
    foods,
    handleServeOrder,
    isClockedIn,
    isClockingIn,
    loading,
    onLogout,
    onRefresh,
    openTableOrder,
    orders,
    tables,
    selectedTable,
    assignedTables,
    serverEmployeeId,
    storedEmployeeId,
    user,
  ]);

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-[#F8FAFC]">
      {/* Pinned Server Top Header (hidden when on full-screen profile page) */}
      {activeTab !== 'profile' ? (
        <ServerTopHeader
          user={user}
          onLogout={onLogout}
          onClockOut={clockOut}
          onOpenProfile={() => setActiveTab('profile')}
        />
      ) : null}

      {/* Keep the item-order and profile screens independent so they manage their own scrolls */}
      {selectedTable || activeTab === 'profile' ? (
        <View className="flex-1" style={{ zIndex: 0 }}>
          {mainContent}
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          style={{ zIndex: 0 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF7800', '#116C0B']}
              tintColor="#FF7800"
            />
          }
        >
          {mainContent}
        </ScrollView>
      )}

      {/* Attendance Modal */}
      <ConfirmDialog
        visible={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        title="Mark Shift Attendance"
        message="Clock in before starting your tables service shift today."
        confirmLabel="Clock In & Start Shift"
        cancelLabel="Dismiss For Now"
        variantType="warning"
        isLoading={isClockingIn}
        errorMessage={attendanceError}
        onConfirm={() => void clockIn()}
      />

      {/* Order Details Bottom Sheet */}
      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onServe={handleServeOrder}
      />

      {/* Keep the order screen focused on its KOT actions. */}
      {!selectedTable ? (
        <ServerBottomBar
          activeTab={activeTab}
          onPress={tab => {
            setSelectedTable(null);
            setActiveTab(tab);
          }}
          onPlusPress={() => setIsAssignedTablesOpen(true)}
        />
      ) : null}

      {/* Assigned Tables Modal */}
      <BaseModal
        visible={isAssignedTablesOpen}
        onClose={() => setIsAssignedTablesOpen(false)}
        title="Assigned Tables"
        subtitle={`${assignedTables.length} tables assigned to your station`}
        variant="bottom-sheet"
        footer={
          <Pressable
            onPress={() => setIsAssignedTablesOpen(false)}
            className="min-h-12 w-full items-center justify-center rounded-2xl bg-[#012711] active:bg-[#0B4D1A]"
          >
            <Text className="text-sm font-extrabold text-white">Close</Text>
          </Pressable>
        }
      >
        <ScrollView className="max-h-[380px]" contentContainerClassName="gap-2.5 pb-2" showsVerticalScrollIndicator={false}>
          {assignedTables.length ? (
            assignedTables.map((table, index) => {
              const num = String(table.table_number ?? table.id ?? table.table_id);
              const isOccupied =
                occupiedTableNumbers.has(num) ||
                String(table.status || '').toLowerCase() === 'occupied';

              return (
                <Pressable
                  key={`${table.table_id ?? table.id ?? index}`}
                  onPress={() => void openTableOrder(table)}
                  className="flex-row items-center justify-between rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 active:bg-[#F1F5F9]"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`h-11 w-11 items-center justify-center rounded-xl ${
                        isOccupied ? 'bg-amber-100' : 'bg-emerald-100'
                      }`}
                    >
                      <TableSvg color={isOccupied ? '#D97706' : '#15803D'} size={20} />
                    </View>
                    <View>
                      <Text className="text-base font-black text-[#012711]">
                        Table {num}
                      </Text>
                      <Text className="mt-0.5 text-xs text-[#64748B]">
                        {table.no_of_seats ?? 4} Seats • Station Floor
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <View
                      className={`rounded-full px-2.5 py-1 ${
                        isOccupied ? 'bg-amber-100' : 'bg-emerald-100'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-black uppercase ${
                          isOccupied ? 'text-amber-800' : 'text-emerald-800'
                        }`}
                      >
                        {isOccupied ? 'Occupied' : 'Available'}
                      </Text>
                    </View>
                    <Text className="mt-1 text-[10px] font-bold text-[#116C0B]">
                      Tap to take order ›
                    </Text>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View className="items-center py-8">
              <Text className="text-sm font-bold text-[#64748B]">
                No tables are assigned to you.
              </Text>
              <Text className="mt-1 text-center text-xs text-[#94A3B8]">
                Tables assigned by floor supervisor will show up here automatically.
              </Text>
            </View>
          )}
        </ScrollView>
      </BaseModal>
    </SafeAreaView>
  );
}
