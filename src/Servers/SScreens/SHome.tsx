import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import api from '../../../api';
import type { HeaderUser } from '../../Admin/Navigation/TopHeader';
import colors from '../../theme/colors';
import ServerBottomBar, { type ServerTab } from '../SNavigations/SBottombsr';
import ServerTopHeader from '../SNavigations/STopHeder';

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
  user,
  isClockedIn,
  clockInTime,
  onOpenAttendance,
  onSelectTab,
  onSelectOrder,
  onServeOrder,
}: {
  orders: Row[];
  foods: Row[];
  tables: ServerTable[];
  user: HeaderUser;
  isClockedIn: boolean;
  clockInTime: string;
  onOpenAttendance: () => void;
  onSelectTab: (tab: ServerTab) => void;
  onSelectOrder: (order: Row) => void;
  onServeOrder: (order: Row) => void;
}) {
  const name = user.name?.trim() || user.username?.trim() || 'Server';
  const [orderFilter, setOrderFilter] = useState<'all' | 'ready' | 'cooking' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    return orders.filter(order =>
      ['pending', 'preparing', 'cooking', 'ready', 'confirmed'].includes(
        value(order, ['status', 'order_status'], '').toLowerCase(),
      ),
    );
  }, [orders]);

  const readyOrders = useMemo(() => {
    return activeOrders.filter(order =>
      ['ready', 'prepared', 'cooked'].includes(
        value(order, ['status', 'order_status'], '').toLowerCase(),
      ),
    );
  }, [activeOrders]);

  const cookingOrders = useMemo(() => {
    return activeOrders.filter(order =>
      ['preparing', 'cooking'].includes(
        value(order, ['status', 'order_status'], '').toLowerCase(),
      ),
    );
  }, [activeOrders]);

  const pendingOrders = useMemo(() => {
    return activeOrders.filter(order =>
      ['pending', 'confirmed'].includes(
        value(order, ['status', 'order_status'], '').toLowerCase(),
      ),
    );
  }, [activeOrders]);

  const servedTodayCount = useMemo(() => {
    return orders.filter(order =>
      ['delivered', 'served', 'completed', 'paid'].includes(
        value(order, ['status', 'order_status'], '').toLowerCase(),
      ),
    ).length;
  }, [orders]);

  // Table calculations
  const occupiedTableNumbers = useMemo(() => {
    const tableSet = new Set<string>();
    activeOrders.forEach(o => {
      const t = value(o, ['table_number', 'table_id', 'table'], '');
      if (t && t !== '—') tableSet.add(String(t).trim());
    });
    return tableSet;
  }, [activeOrders]);

  const totalTableCount = tables.length || 12;
  const occupiedTableCount = occupiedTableNumbers.size || Math.min(activeOrders.length, totalTableCount);

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
            label="Occupied Tables"
            value={`${occupiedTableCount} / ${totalTableCount}`}
            subtext="Active seating floor"
            badge="TABLES"
            tone="indigo"
            icon={TableSvg}
            onPress={() => onSelectTab('tables')}
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

        <View className="mt-3 flex-row flex-wrap justify-between gap-y-3">
          {[
            {
              label: 'Floor Tables',
              desc: 'Table seating & status',
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
            <Text className="text-xl font-extrabold text-[#012711]">
              Popular Menu Dishes
            </Text>
            <Text className="text-xs text-[#64748B]">
              Quick item reference for order recommendations
            </Text>
          </View>
          <Pressable onPress={() => onSelectTab('foods')}>
            <Text className="text-xs font-bold text-[#FF7800]">
              Full Menu ›
            </Text>
          </Pressable>
        </View>

        <View className="mt-3 flex-row flex-wrap justify-between gap-y-3">
          {foods.slice(0, 4).map((food, idx) => {
            const foodName = value(food, ['food_name', 'product_name', 'name'], 'Dish');
            const category = value(food, ['category_name', 'category'], 'Menu item');
            const price = value(food, ['price', 'selling_price', 'unit_price'], '0');

            return (
              <View
                key={`${foodName}-${idx}`}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: 16,
                  borderWidth: 1,
                  padding: 12,
                  width: '48.5%',
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="rounded-md bg-[#FFF7ED] px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-[#EA580C]">
                      {category}
                    </Text>
                  </View>
                  <SparklesSvg color="#F59E0B" size={14} />
                </View>

                <Text
                  numberOfLines={1}
                  className="mt-2 text-sm font-bold text-[#0F172A]"
                >
                  {foodName}
                </Text>
                <Text className="mt-1 text-xs font-extrabold text-[#116C0B]">
                  {formatPrice(price)}
                </Text>
              </View>
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
}: {
  tables: ServerTable[];
  orders: Row[];
  onSelectTable: (tableNum: string) => void;
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
    if (tables.length > 0) {
      return tables.map(t => {
        const num = String(t.table_number || t.id || t.table_id || '1');
        const isOccupied = occupiedMap.has(num) || (t.status || '').toLowerCase() === 'occupied';
        return {
          id: num,
          number: num,
          seats: Number(t.no_of_seats || 4),
          status: isOccupied ? 'Occupied' : 'Available',
          activeOrder: occupiedMap.get(num),
        };
      });
    }

    // Default 12 restaurant tables fallback
    return Array.from({ length: 12 }, (_, i) => {
      const num = String(i + 1);
      const isOccupied = occupiedMap.has(num);
      return {
        id: num,
        number: num,
        seats: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
        status: isOccupied ? 'Occupied' : 'Available',
        activeOrder: occupiedMap.get(num),
      };
    });
  }, [tables, occupiedMap]);

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
}: {
  user: HeaderUser;
  onLogout: () => void;
  onRefresh: () => void;
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

  const orderNumber = value(order, ['order_number', 'order_id', 'id'], '#000');
  const tableNum = value(order, ['table_number', 'table_id', 'table'], 'Takeaway');
  const customerName = value(order, ['customer_name', 'customerName', 'customer'], 'Guest');
  const status = value(order, ['status', 'order_status'], 'Pending');
  const totalAmount = value(order, ['total_amount', 'grand_total', 'amount'], '0');
  const items = getOrderItems(order);
  const isReady = ['ready', 'prepared', 'cooked'].includes(status.toLowerCase());

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: '85%',
            padding: 20,
          }}
        >
          {/* Modal Header */}
          <View className="flex-row items-center justify-between border-b border-[#F1F5F9] pb-3">
            <View>
              <Text className="text-lg font-extrabold text-[#012711]">
                Order Details • {orderNumber}
              </Text>
              <Text className="text-xs text-[#64748B]">
                Table: <Text className="font-bold text-[#012711]">{tableNum}</Text> • Guest: {customerName}
              </Text>
            </View>
            <Pressable onPress={onClose} className="rounded-full bg-slate-100 p-2">
              <CloseSvg color="#64748B" size={18} />
            </Pressable>
          </View>

          {/* Items List */}
          <ScrollView className="my-4 max-h-72">
            <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
              Ordered Items ({items.length})
            </Text>
            {items.map((item, idx) => (
              <View
                key={`${item.name}-${idx}`}
                className="mb-2 rounded-xl border border-[#F1F5F9] bg-[#F8FAFC] p-3"
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
          </ScrollView>

          {/* Total & Action */}
          <View className="border-t border-[#F1F5F9] pt-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-[#64748B]">Grand Total</Text>
              <Text className="text-xl font-extrabold text-[#012711]">
                {formatPrice(totalAmount)}
              </Text>
            </View>

            <View className="mt-4 flex-row gap-2">
              {isReady ? (
                <Pressable
                  onPress={() => {
                    onServe(order);
                    onClose();
                  }}
                  className="flex-1 h-12 items-center justify-center rounded-xl bg-[#116C0B]"
                >
                  <Text className="font-extrabold text-white">Serve Table Now</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={onClose}
                className="flex-1 h-12 items-center justify-center rounded-xl bg-slate-100"
              >
                <Text className="font-bold text-[#475569]">Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
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

  const loadHome = useCallback(async () => {
    const [orderResult, foodResult, tableResult] = await Promise.allSettled([
      api.get('/orders/management'),
      api.get('/foods'),
      api.get('/server-tables'),
    ]);

    setOrders(
      orderResult.status === 'fulfilled' ? rows(orderResult.value.data) : [],
    );
    setFoods(
      foodResult.status === 'fulfilled' ? rows(foodResult.value.data) : [],
    );
    setTables(
      tableResult.status === 'fulfilled'
        ? (rows(tableResult.value.data) as ServerTable[])
        : [],
    );
  }, []);

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

    if (activeTab === 'home') {
      return (
        <HomeTabContent
          orders={orders}
          foods={foods}
          tables={tables}
          user={user}
          isClockedIn={isClockedIn}
          clockInTime={clockInTime}
          onOpenAttendance={() => setIsAttendanceOpen(true)}
          onSelectTab={setActiveTab}
          onSelectOrder={setSelectedOrder}
          onServeOrder={handleServeOrder}
        />
      );
    }

    if (activeTab === 'tables') {
      return (
        <TablesTabContent
          tables={tables}
          orders={orders}
          onSelectTable={tableNum => {
            setActiveTab('home');
          }}
        />
      );
    }

    if (activeTab === 'foods') {
      return <FoodsTabContent foods={foods} />;
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

    return (
      <MoreTabContent
        user={user}
        onLogout={onLogout}
        onRefresh={onRefresh}
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
    orders,
    tables,
    user,
  ]);

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-[#F8FAFC]">
      {/* Pinned Server Top Header */}
      <ServerTopHeader
        user={user}
        onLogout={onLogout}
        onClockOut={clockOut}
      />

      {/* Main Scroll Content with Pull-To-Refresh */}
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

      {/* Attendance Modal */}
      <Modal
        visible={isAttendanceOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAttendanceOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <View className="w-full max-w-[360px] rounded-3xl bg-white p-6 shadow-2xl">
            <View className="items-center">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#FFF0DE]">
                <ClockSvg color="#EA580C" size={32} />
              </View>
              <Text className="mt-4 text-xl font-extrabold text-[#012711]">
                Mark Shift Attendance
              </Text>
              <Text className="mt-2 text-center text-xs leading-5 text-[#64748B]">
                Clock in before starting your tables service shift today.
              </Text>
            </View>

            {attendanceError ? (
              <Text className="mt-4 rounded-xl bg-[#FEF2F2] p-3 text-center text-xs font-semibold text-[#B91C1C]">
                {attendanceError}
              </Text>
            ) : null}

            <Pressable
              disabled={isClockingIn}
              onPress={() => void clockIn()}
              className="mt-5 h-12 items-center justify-center rounded-xl bg-[#FF7800] active:bg-[#EA580C]"
            >
              {isClockingIn ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="font-extrabold text-white">Clock In & Start Shift</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => setIsAttendanceOpen(false)}
              className="mt-2 h-10 items-center justify-center"
            >
              <Text className="text-xs font-bold text-[#64748B]">Dismiss For Now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Order Details Bottom Sheet */}
      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onServe={handleServeOrder}
      />

      {/* Pinned Server Bottom Navigation Bar */}
      <ServerBottomBar activeTab={activeTab} onPress={setActiveTab} />
    </SafeAreaView>
  );
}
