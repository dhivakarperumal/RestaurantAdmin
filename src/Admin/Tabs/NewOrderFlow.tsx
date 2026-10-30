import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../../api';
import colors from '../../theme/colors';
import { MenuIcon, PlusIcon, SearchIcon } from '../Navigation/NavigationIcons';
import { BaseModal, FilterIcon } from '../../components/popups';
import MoreInnerHeader from '../Navigation/MoreInnerHeader';
import {
  readActiveBillTables,
  canSelectTableForNewOrder,
  getReservationSummary,
  getServerAssignmentLabel,
  getAssignedServerName,
  getTableStatus,
  isReservationActive,
  tableHasActiveBill,
} from './tableAvailability';
import {
  createOrderRequestKey,
  getKitchenOrderTypeFields,
  getOrderRequestKeyHeaders,
  getOrderRequestKeyPayload,
  getOrderSubmissionError,
  hasValidTableId,
  isValidOrderRequestKey,
  resolveApiOrderType,
} from './orderSubmission';
import { isFoodAvailable } from './foodAvailability';
import type {
  AdminTableRecord,
  ExistingBillContext,
  NewOrderType,
} from '../Navigation/DashboardTypes';
import type { ActiveBillTableReference } from './tableAvailability';

type RecordValue = Record<string, unknown>;

type FoodAddon = {
  id: string;
  name: string;
  price: number;
};

type CustomizationOption = {
  id: string;
  name: string;
  price: number;
};

type FoodCustomization = {
  id: string;
  name: string;
  selectionType: 'Single' | 'Multiple';
  required: boolean;
  options: CustomizationOption[];
};

type MenuFood = {
  id: string;
  name: string;
  category: string;
  price: number | null;
  image?: string;
  raw: RecordValue;
  addons: FoodAddon[];
  customizations: FoodCustomization[];
};

type CartLine = {
  key: string;
  food: MenuFood;
  quantity: number;
  addonIds: string[];
  customizations: Record<string, string[]>;
};

type TableStatusFilter = 'All' | 'Available' | 'Occupied' | 'Reserved';
type FoodTypeFilter = 'All' | 'Veg' | 'Non Veg';
type FoodOfferFilter = 'All' | 'Offers';

type TableRecord = AdminTableRecord & {
  no_of_seats?: number | string;
  reservation_is_active?: unknown;
  next_reservation_status?: unknown;
  next_reservation_date?: unknown;
  next_reservation_start_time?: unknown;
  next_reservation_end_time?: unknown;
  next_reservation_customer_name?: unknown;
  next_reservation_guests?: unknown;
  assigned_to?: unknown;
  waiter_id?: unknown;
};

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRows(value: unknown): RecordValue[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function readRows(payload: unknown, keys: string[], depth = 0): RecordValue[] {
  if (depth > 5) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }
  if (!isRecord(payload)) {
    return [];
  }
  for (const key of keys) {
    if (key in payload) {
      const rows = readRows(payload[key], keys, depth + 1);
      if (rows.length || Array.isArray(payload[key])) {
        return rows;
      }
    }
  }
  return [];
}

function readTables(payload: unknown): TableRecord[] {
  return readRows(payload, ['server_tables', 'tables', 'data']).map(row => ({
    id:
      typeof row.id === 'string' || typeof row.id === 'number'
        ? row.id
        : undefined,
    table_id:
      typeof row.table_id === 'string' || typeof row.table_id === 'number'
        ? row.table_id
        : undefined,
    table_number:
      typeof row.table_number === 'string' ||
      typeof row.table_number === 'number'
        ? row.table_number
        : undefined,
    no_of_seats:
      typeof row.no_of_seats === 'string' || typeof row.no_of_seats === 'number'
        ? row.no_of_seats
        : undefined,
    status: typeof row.status === 'string' ? row.status : undefined,
    reservation_is_active: row.reservation_is_active,
    next_reservation_status: row.next_reservation_status,
    next_reservation_date: row.next_reservation_date,
    next_reservation_start_time: row.next_reservation_start_time,
    next_reservation_end_time: row.next_reservation_end_time,
    next_reservation_customer_name: row.next_reservation_customer_name,
    next_reservation_guests: row.next_reservation_guests,
    assigned_server_id:
      row.assigned_server_id ??
      row.assigned_employee_id ??
      row.server_id ??
      row.employee_id ??
      row.waiter_id ??
      row.assigned_to,
    assigned_server_name:
      row.assigned_server_name ??
      row.server_name ??
      row.assigned_employee_name ??
      row.employee_name,
    assigned_employee_name: row.assigned_employee_name,
    server_name: row.server_name,
    employee_name: row.employee_name,
    assigned_server: row.assigned_server,
    assigned_employee: row.assigned_employee,
    server: row.server,
    employee: row.employee,
    assigned_to: row.assigned_to,
    waiter_id: row.waiter_id,
  }));
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim() || fallback
    : fallback;
}

function amount(value: unknown, fallback = 0) {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return fallback;
  }
  const parsed = Number(String(value).replace(/[₹,\s]/g, ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function nullableAmount(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return null;
  }
  const parsed = Number(String(value).replace(/[₹,\s]/g, ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function imageUri(value: unknown) {
  const image = Array.isArray(value)
    ? value.find(item => typeof item === 'string')
    : value;
  if (typeof image !== 'string' || !image.trim()) {
    return undefined;
  }
  const uri = image.trim();
  if (/^(https?:|data:image\/|file:|content:)/i.test(uri)) {
    return uri;
  }
  const apiRoot = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  return `${apiRoot}/${uri.replace(/^\/+/, '')}`;
}

function flag(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    if (/^(false|0|no|inactive)$/i.test(value.trim())) return false;
    if (/^(true|1|yes|active)$/i.test(value.trim())) return true;
  }
  return fallback;
}

function getFoodType(food: MenuFood): Exclude<FoodTypeFilter, 'All'> | null {
  const value = text(food.raw.food_type ?? food.raw.foodType).toLowerCase();
  if (/^(non[\s_-]*veg|non[\s_-]*vegetarian)$/.test(value)) {
    return 'Non Veg';
  }
  if (/^(veg|vegetarian)$/.test(value)) {
    return 'Veg';
  }
  return null;
}

function getFoodOfferDiscount(food: MenuFood): number | null {
  const discount = Number(food.raw.discount);
  return Number.isFinite(discount) && discount > 0 && discount <= 100
    ? discount
    : null;
}

function readFoods(payload: unknown): MenuFood[] {
  return readRows(payload, ['foods', 'products', 'items', 'data']).flatMap(
    (row, index) => {
      const id = text(row.food_id ?? row.product_id ?? row.id);
      const name = text(
        row.food_name ?? row.product_name ?? row.name,
        `Food ${index + 1}`,
      );
      if (!id) {
        return [];
      }
      const addons = asRows(row.addons)
        .filter(
          addon => text(addon.status, 'Active').toLowerCase() !== 'inactive',
        )
        .map((addon, addonIndex) => ({
          id: text(addon.addon_id ?? addon.id, `addon-${addonIndex}`),
          name: text(addon.addon_name ?? addon.name),
          price: amount(addon.price),
        }))
        .filter(addon => addon.name);
      const customizations = asRows(row.customizations).map(
        (customization, groupIndex) => ({
          id: text(customization.id, `customization-${groupIndex}`),
          name: text(customization.name, `Customization ${groupIndex + 1}`),
          selectionType:
            text(customization.selection_type).toLowerCase() === 'multiple'
              ? ('Multiple' as const)
              : ('Single' as const),
          required: flag(customization.required, false),
          options: asRows(customization.options).map((option, optionIndex) => ({
            id: text(option.id, `option-${groupIndex}-${optionIndex}`),
            name: text(option.name, `Option ${optionIndex + 1}`),
            price: amount(option.price),
          })),
        }),
      );
      const rawPrice =
        row.final_price ??
        row.finalPrice ??
        row.selling_price ??
        row.sellingPrice ??
        row.price ??
        row.food_price ??
        row.unit_price ??
        row.mrp;
      return [
        {
          id,
          name,
          category: text(row.category_name ?? row.category, 'Food'),
          price: nullableAmount(rawPrice),
          image: imageUri(
            row.food_images ?? row.food_image ?? row.image_url ?? row.image,
          ),
          raw: row,
          addons,
          customizations,
        },
      ];
    },
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return isRecord(error) && typeof error.message === 'string'
    ? error.message
    : fallback;
}

function tableStatus(
  table: TableRecord,
  hasActiveBill = false,
) {
  return getTableStatus(table, hasActiveBill);
}

function containsActiveBill(payload: unknown): boolean {
  if (!isRecord(payload)) {
    return false;
  }
  if ('bill' in payload) {
    return containsActiveBill(payload.bill);
  }
  if ('data' in payload && isRecord(payload.data)) {
    return containsActiveBill(payload.data);
  }
  return (
    payload.bill_id !== undefined ||
    payload.id !== undefined ||
    (Array.isArray(payload.rounds) && payload.rounds.length > 0)
  );
}

function readActiveBillId(payload: unknown): string | null {
  let current = payload;
  for (let depth = 0; depth < 5; depth += 1) {
    if (!isRecord(current)) {
      return null;
    }
    if (isRecord(current.bill)) {
      current = current.bill;
      continue;
    }
    if (isRecord(current.data)) {
      current = current.data;
      continue;
    }
    const id = current.bill_id ?? current.id;
    return id === undefined || id === null ? null : String(id);
  }
  return null;
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getLinePrice(line: CartLine) {
  const addons = line.food.addons
    .filter(addon => line.addonIds.includes(addon.id))
    .reduce((sum, addon) => sum + addon.price, 0);
  const customizations = line.food.customizations.reduce(
    (sum, group) =>
      sum +
      group.options
        .filter(option => line.customizations[group.id]?.includes(option.id))
        .reduce((optionSum, option) => optionSum + option.price, 0),
    0,
  );
  return (line.food.price ?? 0) + addons + customizations;
}

export default function NewOrderFlow({
  orderType,
  initialTable,
  existingBill,
  onOpenActiveBill,
  onAddItemsToActiveBill,
  onBack,
  onOrderSubmitted,
}: {
  orderType: NewOrderType;
  initialTable?: AdminTableRecord;
  existingBill?: ExistingBillContext;
  onOpenActiveBill: (table: AdminTableRecord) => void;
  onAddItemsToActiveBill: (
    table: AdminTableRecord,
    context: ExistingBillContext,
  ) => void;
  onBack: () => void;
  onOrderSubmitted: () => void;
}) {
  const { width } = useWindowDimensions();
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] =
    useState<TableStatusFilter>('Available');
  const [activeBillTables, setActiveBillTables] = useState<
    ActiveBillTableReference[]
  >([]);
  const [selectedTable, setSelectedTable] = useState<TableRecord | null>(
    initialTable ?? null,
  );
  const [isLoadingTables, setIsLoadingTables] = useState(
    orderType === 'DINE_IN',
  );
  const [tablesError, setTablesError] = useState('');
  const [addingItemsTableId, setAddingItemsTableId] = useState<string | null>(
    null,
  );
  const [foods, setFoods] = useState<MenuFood[]>([]);
  const [isLoadingFoods, setIsLoadingFoods] = useState(true);
  const [foodsError, setFoodsError] = useState('');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [foodTypeFilter, setFoodTypeFilter] =
    useState<FoodTypeFilter>('All');
  const [foodOfferFilter, setFoodOfferFilter] =
    useState<FoodOfferFilter>('All');
  const [foodCategoryFilter, setFoodCategoryFilter] = useState('All');
  const [minimumFoodPrice, setMinimumFoodPrice] = useState('');
  const [maximumFoodPrice, setMaximumFoodPrice] = useState('');
  const [minimumFoodRating, setMinimumFoodRating] = useState<number | null>(
    null,
  );
  const [isFoodFilterOpen, setIsFoodFilterOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [discountInput, setDiscountInput] = useState('0');
  const [selectedFood, setSelectedFood] = useState<MenuFood | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [selectedCustomizations, setSelectedCustomizations] = useState<
    Record<string, string[]>
  >({});
  const [customizationError, setCustomizationError] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const submissionLock = useRef(false);
  const orderRequestKeyRef = useRef<{ signature: string; key: string } | null>(
    null,
  );
  useEffect(() => {
    if (initialTable) {
      setSelectedTable(initialTable);
    }
  }, [initialTable]);

  const resolvedOrderType = resolveApiOrderType(orderType, selectedTable);
  const isDineIn = resolvedOrderType === 'dine_in';
  const isDelivery = resolvedOrderType === 'home_delivery';
  const orderLabel = isDineIn
    ? 'Dine-In / Table'
    : isDelivery
    ? 'Home Delivery'
    : 'Pick Up';
  const tableStatusCounts = useMemo(() => {
    const counts: Record<TableStatusFilter, number> = {
      All: tables.length,
      Available: 0,
      Occupied: 0,
      Reserved: 0,
    };
    tables.forEach(table => {
      const hasActiveBill = tableHasActiveBill(table, activeBillTables);
      const status = tableStatus(table, hasActiveBill);
      if (status === 'Available' || status === 'Occupied' || status === 'Reserved') {
        counts[status] += 1;
      }
    });
    return counts;
  }, [activeBillTables, tables]);
  const filteredTables = useMemo(
    () => {
      const query = tableSearch.trim().toLowerCase();
      return tables.filter(table => {
        const hasActiveBill = tableHasActiveBill(table, activeBillTables);
        const status = tableStatus(table, hasActiveBill);
        const matchesStatus =
          tableStatusFilter === 'All' || status === tableStatusFilter;
        const searchableText = [
          table.table_number,
          table.no_of_seats,
          status,
          getServerAssignmentLabel(table),
          getReservationSummary(table),
        ]
          .filter(value => value !== undefined && value !== null)
          .join(' ')
          .toLowerCase();
        return matchesStatus && (!query || searchableText.includes(query));
      });
    },
    [activeBillTables, tableSearch, tableStatusFilter, tables],
  );
  const horizontalPadding = width >= 768 ? 24 : 16;
  const cardGap = 12;
  const cardWidth =
    (Math.min(width, 1100) - horizontalPadding * 2 - cardGap) / 2;
  const availableFoods = useMemo(
    () =>
      foods.filter(food => {
        const availabilityKey = isDineIn
          ? 'dining_available'
          : isDelivery
          ? 'delivery_available'
          : 'takeaway_available';
        return isFoodAvailable(food.raw, availabilityKey);
      }),
    [foods, isDelivery, isDineIn],
  );
  const foodCategories = useMemo(
    () =>
      Array.from(
        new Map(
          availableFoods
            .map(food => food.category.trim())
            .filter(Boolean)
            .map(category => [category.toLowerCase(), category]),
        ).values(),
      ).sort((left, right) => left.localeCompare(right)),
    [availableFoods],
  );
  const activeFoodFilterCount =
    Number(foodOfferFilter !== 'All') +
    Number(foodCategoryFilter !== 'All') +
    Number(minimumFoodRating !== null) +
    Number(Boolean(minimumFoodPrice.trim() || maximumFoodPrice.trim()));
  const visibleFoods = useMemo(() => {
    const query = search.trim().toLowerCase();
    const minPriceText = minimumFoodPrice.replace(/,/g, '').trim();
    const maxPriceText = maximumFoodPrice.replace(/,/g, '').trim();
    const minimumPrice = minPriceText ? Number(minPriceText) : null;
    const maximumPrice = maxPriceText ? Number(maxPriceText) : null;
    const hasValidMinimum =
      minimumPrice !== null && Number.isFinite(minimumPrice) && minimumPrice >= 0;
    const hasValidMaximum =
      maximumPrice !== null && Number.isFinite(maximumPrice) && maximumPrice >= 0;
    return availableFoods.filter(
      food => {
        const matchesSearch =
          !query || `${food.name} ${food.category}`.toLowerCase().includes(query);
        const matchesFoodType =
          foodTypeFilter === 'All' || getFoodType(food) === foodTypeFilter;
        const matchesOffer =
          foodOfferFilter === 'All' || getFoodOfferDiscount(food) !== null;
        const matchesCategory =
          foodCategoryFilter === 'All' ||
          food.category.toLowerCase() === foodCategoryFilter.toLowerCase();
        const matchesMinimumPrice =
          !hasValidMinimum ||
          (food.price !== null && food.price >= minimumPrice);
        const matchesMaximumPrice =
          !hasValidMaximum ||
          (food.price !== null && food.price <= maximumPrice);
        const ratingValue = Number(
          food.raw.rating ??
            food.raw.average_rating ??
            food.raw.avg_rating ??
            food.raw.food_rating,
        );
        const hasRating = Number.isFinite(ratingValue);
        const matchesRating =
          minimumFoodRating === null ||
          (hasRating && ratingValue >= minimumFoodRating);
        return (
          matchesSearch &&
          matchesFoodType &&
          matchesOffer &&
          matchesCategory &&
          matchesMinimumPrice &&
          matchesMaximumPrice &&
          matchesRating
        );
      },
    );
  }, [
    availableFoods,
    foodCategoryFilter,
    foodOfferFilter,
    minimumFoodRating,
    foodTypeFilter,
    maximumFoodPrice,
    minimumFoodPrice,
    search,
  ]);
  const subtotal = cart.reduce(
    (sum, line) => sum + getLinePrice(line) * line.quantity,
    0,
  );
  const discount = Math.min(
    subtotal,
    Math.max(0, Number(discountInput.replace(/,/g, '')) || 0),
  );
  const taxableAmount = subtotal - discount;
  const cgst = taxableAmount * 0.025;
  const sgst = taxableAmount * 0.025;
  const tax = cgst + sgst;
  const total = taxableAmount + tax;
  const phoneDigits = customerPhone.replace(/\D/g, '');
  const hasDeliveryDetails =
    customerName.trim().length > 0 &&
    phoneDigits.length >= 7 &&
    phoneDigits.length <= 15 &&
    deliveryAddress.trim().length > 0;
  const canSubmit =
    cart.length > 0 &&
    !cart.some(line => !line.food.id || line.food.price === null) &&
    getOrderSubmissionError({
      orderType,
      itemCount: cart.length,
      table: selectedTable,
      hasDeliveryDetails,
    }) === null &&
    !isSubmitting &&
    !hasSubmitted;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIsLoadingFoods(true);
    setFoodsError('');
    api
      .get('/foods', { signal: controller.signal })
      .then(response => {
        if (active) {
          setFoods(readFoods(response.data));
        }
      })
      .catch(error => {
        if (active && !controller.signal.aborted) {
          setFoodsError(
            getErrorMessage(
              error,
              'Unable to load food menu. Please try again.',
            ),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingFoods(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [retry]);

  useEffect(() => {
    if (!isDineIn) {
      setIsLoadingTables(false);
      setActiveBillTables([]);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setIsLoadingTables(true);
    setTablesError('');
    Promise.all([
      api.get('/server-tables', { signal: controller.signal }),
      api.get('/table-bills', {
        params: { status: 'Active' },
        signal: controller.signal,
      }),
    ])
      .then(([tablesResponse, billsResponse]) => {
        if (active) {
          if (
            (isRecord(tablesResponse.data) &&
              tablesResponse.data.success === false) ||
            (isRecord(billsResponse.data) &&
              billsResponse.data.success === false)
          ) {
            const failedResponse =
              isRecord(tablesResponse.data) &&
              tablesResponse.data.success === false
                ? tablesResponse.data
                : billsResponse.data;
            throw new Error(
              typeof failedResponse.message === 'string'
                ? failedResponse.message
                : 'Unable to load tables and active bills.',
            );
          }
          setTables(readTables(tablesResponse.data));
          setActiveBillTables(readActiveBillTables(billsResponse.data));
        }
      })
      .catch(error => {
        if (active && !controller.signal.aborted) {
          setTablesError(
            getErrorMessage(error, 'Unable to load tables. Please try again.'),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingTables(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [isDineIn, retry]);

  const chooseTable = async (table: TableRecord) => {
    const hasActiveBill = tableHasActiveBill(table, activeBillTables);
    if (getTableStatus(table, hasActiveBill) === 'Occupied') {
      onOpenActiveBill(table);
      return;
    }
    if (!canSelectTableForNewOrder(table, hasActiveBill)) {
      if (isReservationActive(table)) {
        Alert.alert(
          'Table reserved',
          `Table ${text(table.table_number)} is currently reserved.`,
        );
      }
      return;
    }
    const identifier = table.table_id ?? table.id;
    if (identifier === undefined || identifier === null) {
      Alert.alert('Cannot select table', 'This table is missing its ID.');
      return;
    }
    try {
      const response = await api.get(
        `/table-bills/active/${encodeURIComponent(String(identifier))}`,
      );
      const payload = response.data;
      if (isRecord(payload) && payload.success === false) {
        throw new Error(
          typeof payload.message === 'string'
            ? payload.message
            : 'Unable to verify whether this table has an active bill.',
        );
      }
      const bill =
        isRecord(payload) && isRecord(payload.bill)
          ? payload.bill
          : isRecord(payload) && isRecord(payload.data)
          ? payload.data
          : payload;
      const activeBillFound =
        isRecord(bill) &&
        (bill.bill_id !== undefined ||
          bill.id !== undefined ||
          (Array.isArray(bill.rounds) && bill.rounds.length > 0));
      if (activeBillFound) {
        Alert.alert(
          'Table already has an active bill',
          `Table ${text(
            table.table_number,
          )} cannot start a new order until its current bill is settled.`,
        );
        setRetry(value => value + 1);
        return;
      }
      setSelectedTable(table);
    } catch (error) {
      if (isRecord(error) && Number(error.status) === 404) {
        setSelectedTable(table);
        return;
      }
      Alert.alert(
        'Unable to verify table',
        getErrorMessage(error, 'Please refresh tables and try again.'),
      );
    }
  };

  const addItemsToActiveBill = async (table: TableRecord) => {
    const tableId = table.table_id ?? table.id;
    if (tableId === undefined || tableId === null || !String(tableId).trim()) {
      Alert.alert('Cannot add items', 'This table is missing its ID.');
      return;
    }

    setAddingItemsTableId(String(tableId));
    try {
      const response = await api.get(
        `/table-bills/active/${encodeURIComponent(String(tableId))}`,
      );
      if (isRecord(response.data) && response.data.success === false) {
        throw new Error(
          typeof response.data.message === 'string'
            ? response.data.message
            : 'Unable to load this table’s active bill.',
        );
      }
      const billId = readActiveBillId(response.data);
      if (!billId) {
        throw new Error(
          'No active bill was found for this table. Refresh the table list and try again.',
        );
      }
      onAddItemsToActiveBill(table, {
        billId,
        tableId: String(tableId),
        tableNumber: text(table.table_number, '—'),
      });
    } catch (error) {
      Alert.alert(
        'Unable to add items',
        getErrorMessage(error, 'Could not load the active bill. Try again.'),
      );
    } finally {
      setAddingItemsTableId(null);
    }
  };

  const selectionKey = (
    food: MenuFood,
    addonIds: string[],
    customizations: Record<string, string[]>,
  ) =>
    `${food.id}:${JSON.stringify({
      addons: [...addonIds].sort(),
      customizations: Object.fromEntries(
        Object.entries(customizations).map(([key, values]) => [
          key,
          [...values].sort(),
        ]),
      ),
    })}`;

  const addConfiguredFood = (
    food: MenuFood,
    addonIds: string[],
    customizations: Record<string, string[]>,
  ) => {
    const key = selectionKey(food, addonIds, customizations);
    setCart(current => {
      const existing = current.find(line => line.key === key);
      if (existing) {
        return current.map(line =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...current,
        {
          key,
          food,
          quantity: 1,
          addonIds,
          customizations,
        },
      ];
    });
  };

  const addFood = (food: MenuFood) => {
    if (food.price === null) {
      Alert.alert(
        'Price unavailable',
        `${food.name} cannot be added until a price is set in the menu.`,
      );
      return;
    }
    if (food.addons.length || food.customizations.length) {
      setSelectedFood(food);
      setSelectedAddonIds([]);
      setSelectedCustomizations({});
      setCustomizationError('');
      return;
    }
    addConfiguredFood(food, [], {});
  };

  const addCustomizedFood = () => {
    if (!selectedFood) return;
    const missingRequired = selectedFood.customizations.find(
      group => group.required && !selectedCustomizations[group.id]?.length,
    );
    if (missingRequired) {
      setCustomizationError(`Choose ${missingRequired.name}.`);
      return;
    }
    addConfiguredFood(selectedFood, selectedAddonIds, selectedCustomizations);
    setSelectedFood(null);
  };

  const changeQuantity = (key: string, delta: number) => {
    setCart(current =>
      current
        .map(line =>
          line.key === key
            ? { ...line, quantity: line.quantity + delta }
            : line,
        )
        .filter(line => line.quantity > 0),
    );
  };

  const sendOrder = async () => {
    if (submissionLock.current || isSubmitting) return;
    const validationError = getOrderSubmissionError({
      orderType,
      itemCount: cart.length,
      table: selectedTable,
      hasDeliveryDetails,
    });
    if (validationError) {
      Alert.alert(
        validationError.startsWith('Choose ')
          ? 'Unable to send order'
          : 'Order details required',
        validationError,
      );
      return;
    }
    const apiOrderType = resolveApiOrderType(orderType, selectedTable);
    if (!apiOrderType) {
      Alert.alert(
        'Unable to send order',
        'Choose dine-in, home delivery, or pickup.',
      );
      return;
    }
    if (
      cart.some(
        line =>
          !line.food.id ||
          line.food.price === null ||
          !Number.isFinite(line.quantity) ||
          line.quantity <= 0,
      )
    ) {
      Alert.alert(
        'Unable to send order',
        'Check that every food item has a valid ID, price, and quantity.',
      );
      return;
    }
    submissionLock.current = true;
    setIsSubmitting(true);
    const requestKeyDiagnostic = {
      endpoint: '/kitchen-orders',
      bodyField: 'order_request_key',
      keyPresent: false,
      keyValid: false,
      payloadFields: [] as string[],
    };
    try {
      const payload: Record<string, unknown> = {
        ...getKitchenOrderTypeFields(apiOrderType),
        items: cart.map(line => ({
          food_id:
            Number.isFinite(Number(line.food.id)) && line.food.id.trim()
              ? Number(line.food.id)
              : line.food.id,
          food_name: line.food.name,
          quantity: line.quantity,
          unit_price: getLinePrice(line),
          selected_addons: line.food.addons
            .filter(addon => line.addonIds.includes(addon.id))
            .map(addon => ({
              addon_id: addon.id,
              addon_name: addon.name,
              price: addon.price,
            })),
          selected_customizations: Object.fromEntries(
            line.food.customizations.flatMap(group => {
              const choices = group.options.filter(option =>
                line.customizations[group.id]?.includes(option.id),
              );
              return choices.length
                ? [[group.name, choices.map(option => option.name)]]
                : [];
            }),
          ),
        })),
        subtotal,
        tax,
        discount,
        total_amount: total,
        status: 'pending',
      };

      if (isDineIn && selectedTable) {
        const tableId = selectedTable.table_id ?? selectedTable.id;
        if (!hasValidTableId(selectedTable)) {
          throw new Error('Select a valid table before sending this order.');
        }
        const latestTablesResponse = await api.get('/server-tables');
        if (
          isRecord(latestTablesResponse.data) &&
          latestTablesResponse.data.success === false
        ) {
          throw new Error(
            typeof latestTablesResponse.data.message === 'string'
              ? latestTablesResponse.data.message
              : 'Unable to verify the latest table status.',
          );
        }
        const latestTables = readTables(latestTablesResponse.data);
        const latestTable = latestTables.find(
          table => String(table.table_id ?? table.id) === String(tableId),
        );
        if (!latestTable) {
          throw new Error(
            `Table ${text(
              selectedTable.table_number,
            )} could not be verified. Refresh tables and try again.`,
          );
        }
        if (existingBill) {
          if (String(existingBill.tableId) !== String(tableId)) {
            throw new Error(
              'The selected table does not match the active bill.',
            );
          }
          const activeBillResponse = await api.get(
            `/table-bills/active/${encodeURIComponent(String(tableId))}`,
          );
          if (
            isRecord(activeBillResponse.data) &&
            activeBillResponse.data.success === false
          ) {
            throw new Error(
              typeof activeBillResponse.data.message === 'string'
                ? activeBillResponse.data.message
                : 'Unable to verify the active bill.',
            );
          }
          if (
            readActiveBillId(activeBillResponse.data) !== existingBill.billId
          ) {
            throw new Error(
              'The active bill changed. Refresh the table and try again.',
            );
          }
          payload.bill_id =
            Number.isFinite(Number(existingBill.billId)) &&
            existingBill.billId.trim()
              ? Number(existingBill.billId)
              : existingBill.billId;
        } else {
          if (!canSelectTableForNewOrder(latestTable)) {
            const reason = isReservationActive(latestTable)
              ? 'is currently reserved'
              : tableStatus(latestTable) === 'Occupied'
                ? 'already has an active bill'
                : 'is no longer available';
            throw new Error(
              `Table ${text(
                selectedTable.table_number,
              )} ${reason}. Refresh tables and choose another table.`,
            );
          }
          try {
            const activeBillResponse = await api.get(
              `/table-bills/active/${encodeURIComponent(String(tableId))}`,
            );
            if (
              isRecord(activeBillResponse.data) &&
              activeBillResponse.data.success === false
            ) {
              throw new Error(
                typeof activeBillResponse.data.message === 'string'
                  ? activeBillResponse.data.message
                  : 'Unable to verify the active bill.',
              );
            }
            if (containsActiveBill(activeBillResponse.data)) {
              throw new Error(
                `Table ${text(
                  selectedTable.table_number,
                )} already has an active bill.`,
              );
            }
          } catch (error) {
            if (!(isRecord(error) && Number(error.status) === 404)) {
              throw error;
            }
          }
        }
        payload.table_id =
          Number.isFinite(Number(tableId)) && String(tableId).trim()
            ? Number(tableId)
            : tableId;
        payload.table_number =
          existingBill?.tableNumber ?? selectedTable.table_number;
        const assignedServerId =
          selectedTable.assigned_server_id ??
          selectedTable.assigned_employee_id ??
          selectedTable.server_id ??
          selectedTable.employee_id ??
          selectedTable.waiter_id;
        if (
          (typeof assignedServerId === 'string' ||
            typeof assignedServerId === 'number') &&
          String(assignedServerId).trim()
        ) {
          const cleanServerId =
            Number.isFinite(Number(assignedServerId)) &&
            String(assignedServerId).trim()
              ? Number(assignedServerId)
              : assignedServerId;
          payload.server_id = cleanServerId;
          payload.assigned_server_id = cleanServerId;
          payload.employee_id = cleanServerId;
        }
        const assignedServerName = getAssignedServerName(selectedTable);
        if (assignedServerName) {
          payload.server_name = assignedServerName;
          payload.assigned_server_name = assignedServerName;
        }
      } else {
        if (customerName.trim()) {
          payload.customer_name = customerName.trim();
        }
        if (customerPhone.trim()) {
          payload.customer_phone = customerPhone.trim();
        }
        if (isDelivery) {
          payload.delivery_address = deliveryAddress.trim();
        }
      }

      const requestSignature = JSON.stringify(payload);
      if (orderRequestKeyRef.current?.signature !== requestSignature) {
        orderRequestKeyRef.current = {
          signature: requestSignature,
          key: createOrderRequestKey(),
        };
      }
      const requestKey = orderRequestKeyRef.current.key;
      requestKeyDiagnostic.keyPresent = Boolean(requestKey);
      requestKeyDiagnostic.keyValid = isValidOrderRequestKey(requestKey);
      Object.assign(payload, getOrderRequestKeyPayload(requestKey));
      requestKeyDiagnostic.payloadFields = Object.keys(payload);
      if (!isValidOrderRequestKey(requestKey)) {
        console.error('KOT submission has an invalid order request key.', {
          ...requestKeyDiagnostic,
        });
        throw new Error(
          'Unable to create a valid order request key. Please try again.',
        );
      }

      const response = await api.post('/kitchen-orders', payload, {
        headers: getOrderRequestKeyHeaders(requestKey),
      });
      if (isRecord(response.data) && response.data.success === false) {
        throw new Error(
          typeof response.data.message === 'string'
            ? response.data.message
            : 'The kitchen rejected this order.',
        );
      }
      setHasSubmitted(true);

      if (isDineIn && selectedTable && !existingBill) {
        const tableId = selectedTable.table_id ?? selectedTable.id;
        if (!hasValidTableId(selectedTable)) {
          throw new Error('The selected table does not have a valid table ID.');
        }
        try {
          await api
            .put(`/server-tables/${encodeURIComponent(String(tableId))}`, {
              status: 'Occupied',
            })
            .catch(() =>
              api.patch(
                `/server-tables/${encodeURIComponent(String(tableId))}`,
                { status: 'Occupied' },
              ),
            );
        } catch (error) {
          Alert.alert(
            'Order sent; table update failed',
            `The order reached the kitchen, but Table ${text(
              selectedTable.table_number,
            )} could not be marked occupied. ${getErrorMessage(
              error,
              'Refresh the table list and update its status.',
            )}`,
            [{ text: 'View Orders', onPress: onOrderSubmitted }],
          );
          return;
        }
      }

      Alert.alert(
        existingBill ? 'Items added to bill' : 'Order sent to kitchen',
        `${orderLabel}${
          selectedTable ? ` · Table ${text(selectedTable.table_number)}` : ''
        } · ${cart.reduce(
          (count, line) => count + line.quantity,
          0,
        )} items · ${formatCurrency(total)}`,
        [
          {
            text: existingBill ? 'View Bill' : 'View Orders',
            onPress: onOrderSubmitted,
          },
        ],
      );
    } catch (error) {
      orderRequestKeyRef.current = null;
      const errorMessage = getErrorMessage(
        error,
        'Please check the connection and try again.',
      );
      if (/order[_ ]request[_ ]key/i.test(errorMessage)) {
        console.error('KOT API rejected the order request key.', {
          ...requestKeyDiagnostic,
        });
      }
      Alert.alert(
        'Unable to send order',
        errorMessage,
      );
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  if (isDineIn && !selectedTable) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-[#F9FAFB]">
        <MoreInnerHeader
          title="Choose a Table"
          destination="Select Order Type"
          subtitle="Tables with an active reservation cannot be selected."
          onBack={onBack}
        />
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            alignSelf: 'center',
            gap: 12,
            maxWidth: 1000,
            padding: 16,
            width: '100%',
          }}
        >
          {isLoadingTables ? (
            <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white p-8">
              <ActivityIndicator color={colors.primary} />
              <Text className="mt-3 text-sm text-[#6B7280]">
                Loading tables...
              </Text>
            </View>
          ) : tablesError ? (
            <View className="items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-6">
              <Text
                accessibilityRole="alert"
                className="text-center text-sm text-[#DC2626]"
              >
                {tablesError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setRetry(value => value + 1)}
                className="rounded-xl bg-[#116C0B] px-4 py-2.5"
              >
                <Text className="font-semibold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : tables.length ? (
            <View>
              <View className="mb-4 min-h-11 flex-row items-center rounded-xl border border-[#D1D5DB] bg-white px-3">
                <SearchIcon color="#9CA3AF" size={17} />
                <TextInput
                  accessibilityLabel="Search tables"
                  className="ml-2 flex-1 py-2 text-sm text-[#012711]"
                  onChangeText={setTableSearch}
                  placeholder="Search by table, seats, server, or status"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="search"
                  value={tableSearch}
                />
              </View>
              <View className="mb-4 flex-row flex-wrap gap-2">
                {(
                  ['All', 'Available', 'Occupied', 'Reserved'] as const
                ).map(filter => {
                  const isSelected = tableStatusFilter === filter;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={filter}
                      onPress={() => setTableStatusFilter(filter)}
                      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
                        isSelected
                          ? 'border-[#116C0B] bg-[#116C0B]'
                          : 'border-[#D1D5DB] bg-white'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-white' : 'text-[#374151]'
                        }`}
                      >
                        {filter}
                      </Text>
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-white' : 'text-[#6B7280]'
                        }`}
                      >
                        {tableStatusCounts[filter]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {filteredTables.length ? (
                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                  {filteredTables.map((table, index) => {
                    const hasActiveBill = tableHasActiveBill(
                      table,
                      activeBillTables,
                    );
                    const status = tableStatus(table, hasActiveBill);
                    const selectable = canSelectTableForNewOrder(
                      table,
                      hasActiveBill,
                    );
                    const canOpenBill = status === 'Occupied';
                    const canOpenCard = selectable || canOpenBill;
                    const reservationSummary = getReservationSummary(table);
                    const serverAssignment = getServerAssignmentLabel(table);
                    const tableDetails = (
                      <>
                        <Text className="text-base font-bold text-[#012711]">
                          Table {text(table.table_number, String(index + 1))}
                        </Text>
                        {table.no_of_seats ? (
                          <Text className="mt-1 text-xs text-[#6B7280]">
                            {table.no_of_seats} seats
                          </Text>
                        ) : null}
                        <Text
                          numberOfLines={1}
                          className="mt-1 text-[10px] text-[#64748B]"
                        >
                          {serverAssignment}
                        </Text>
                        {reservationSummary ? (
                          <Text className="mt-1 text-[10px] text-[#6B7280]">
                            {reservationSummary}
                          </Text>
                        ) : null}
                        {!selectable && status === 'Reserved' ? (
                          <Text className="mt-2 text-xs font-semibold text-[#B45309]">
                            Reserved now
                          </Text>
                        ) : null}
                      </>
                    );

                    return (
                      <View
                        key={String(
                          table.table_id ??
                            table.id ??
                            table.table_number ??
                            index,
                        )}
                        className={`rounded-2xl border bg-white p-4 ${
                          canOpenCard
                            ? 'border-[#DCE8D8]'
                            : 'border-[#E5E7EB] opacity-70'
                        }`}
                        style={{ width: cardWidth }}
                      >
                        <View className="flex-row items-center justify-between gap-2">
                          <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#F0F7EE]">
                            <MenuIcon color={colors.primary} size={21} />
                          </View>
                          <Text
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                              selectable
                                ? 'bg-green-50 text-green-700'
                                : status === 'Occupied'
                                  ? 'bg-orange-50 text-orange-700'
                                  : 'bg-indigo-50 text-indigo-700'
                            }`}
                          >
                            {status}
                          </Text>
                        </View>
                        <View className="mt-3">{tableDetails}</View>
                        {selectable ? (
                          <Pressable
                            accessibilityLabel={`Select items for table ${text(
                              table.table_number,
                              String(index + 1),
                            )}`}
                            accessibilityRole="button"
                            onPress={() => void chooseTable(table)}
                            className="mt-3 min-h-10 items-center justify-center rounded-xl bg-[#064E3B]"
                          >
                            <Text className="text-xs font-bold text-white">
                              Select Items
                            </Text>
                          </Pressable>
                        ) : null}
                        {canOpenBill ? (
                          <View className="mt-3 flex-row gap-2">
                            <Pressable
                              accessibilityLabel={`View bill for table ${text(
                                table.table_number,
                                String(index + 1),
                              )}`}
                              accessibilityRole="button"
                              disabled={addingItemsTableId !== null}
                              onPress={() => void chooseTable(table)}
                              className="min-h-10 flex-1 items-center justify-center rounded-xl border border-[#064E3B] bg-white"
                            >
                              <Text className="text-xs font-bold text-[#064E3B]">
                                View Bill
                              </Text>
                            </Pressable>
                            <Pressable
                              accessibilityLabel={`Add items to bill for table ${text(
                                table.table_number,
                                String(index + 1),
                              )}`}
                              accessibilityRole="button"
                              accessibilityState={{
                                disabled: addingItemsTableId !== null,
                              }}
                              disabled={addingItemsTableId !== null}
                              onPress={() => void addItemsToActiveBill(table)}
                              className={`min-h-10 flex-1 items-center justify-center rounded-xl bg-[#064E3B] ${
                                addingItemsTableId ===
                                String(table.table_id ?? table.id)
                                  ? 'opacity-70'
                                  : ''
                              }`}
                            >
                              <Text className="text-xs font-bold text-white">
                                {addingItemsTableId ===
                                String(table.table_id ?? table.id)
                                  ? 'Loading...'
                                  : 'Add Items'}
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white p-8">
                  <Text className="text-base font-bold text-[#012711]">
                    {tableSearch.trim()
                      ? 'No matching tables'
                      : `No ${tableStatusFilter.toLowerCase()} tables`}
                  </Text>
                  <Text className="mt-2 text-center text-sm text-[#6B7280]">
                    {tableSearch.trim()
                      ? 'Try another table number, server, status, or search term.'
                      : 'Choose another filter to see tables.'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white p-8">
              <Text className="text-base font-bold text-[#012711]">
                No tables found
              </Text>
              <Text className="mt-2 text-center text-sm text-[#6B7280]">
                Add tables in Table Management before starting a dine-in order.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-[#EAF5EE]">
      <View className="flex-1 bg-[#F9FAFB]">
        <MoreInnerHeader
          title={orderLabel}
          destination={isDineIn ? 'Table selection' : 'Dashboard'}
          subtitle={
            isDineIn
              ? [
                  `Table ${text(selectedTable?.table_number)}`,
                  selectedTable?.no_of_seats
                    ? `${selectedTable.no_of_seats} seats`
                    : null,
                  selectedTable
                    ? getServerAssignmentLabel(selectedTable)
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : 'New order'
          }
          onBack={isDineIn ? () => setSelectedTable(null) : onBack}
        />
        {!isDineIn ? (
          <View className="gap-2 border-b border-[#E5E7EB] bg-white px-4 py-3">
            <Text className="text-xs font-bold text-[#012711]">
              Customer details
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                accessibilityLabel="Customer name"
                className="min-h-11 flex-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm text-[#111827]"
                onChangeText={setCustomerName}
                placeholder="Customer name"
                placeholderTextColor="#64748B"
                value={customerName}
              />
              <TextInput
                accessibilityLabel="Customer phone"
                className="min-h-11 flex-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm text-[#111827]"
                keyboardType="phone-pad"
                onChangeText={setCustomerPhone}
                placeholder="Phone number"
                placeholderTextColor="#64748B"
                value={customerPhone}
              />
            </View>
            {isDelivery ? (
              <TextInput
                accessibilityLabel="Delivery address"
                className="min-h-11 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm text-[#111827]"
                multiline
                onChangeText={setDeliveryAddress}
                placeholder="Delivery address"
                placeholderTextColor="#64748B"
                value={deliveryAddress}
              />
            ) : null}
            {isDelivery && !hasDeliveryDetails ? (
              <Text className="text-[11px] text-[#6B7280]">
                Name, valid phone number, and delivery address are required.
              </Text>
            ) : null}
          </View>
        ) : null}

        <View className="flex-row items-center gap-2 px-4 py-3">
          <View className="min-h-14 flex-1 flex-row items-center rounded-2xl border border-[#E5E7EB] bg-white pr-2">
            <TextInput
              accessibilityLabel="Search menu"
              className="min-h-14 flex-1 px-4 text-sm text-[#111827]"
              onChangeText={setSearch}
              placeholder="Search foods or categories..."
              placeholderTextColor="#6B7280"
              value={search}
            />
            <Pressable
              accessibilityLabel="Open food filters"
              accessibilityRole="button"
              accessibilityState={{ selected: activeFoodFilterCount > 0 }}
              onPress={() => setIsFoodFilterOpen(true)}
              className={`h-10 w-10 items-center justify-center rounded-xl ${
                activeFoodFilterCount ? 'bg-[#F0F7EE]' : ''
              }`}
            >
              <FilterIcon
                color={activeFoodFilterCount ? '#116C0B' : '#475569'}
                size={19}
              />
              {activeFoodFilterCount ? (
                <View className="absolute -right-1 -top-1 min-h-4 min-w-4 items-center justify-center rounded-full bg-[#116C0B] px-1">
                  <Text className="text-[9px] font-bold text-white">
                    {activeFoodFilterCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>
        <View className="flex-row flex-wrap gap-2 px-4 pb-3">
          {(['All', 'Veg', 'Non Veg'] as const).map(filter => {
            const selected = foodTypeFilter === filter;
            return (
              <Pressable
                key={filter}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFoodTypeFilter(filter)}
                className={`min-h-9 items-center justify-center rounded-full border px-4 ${
                  selected
                    ? 'border-[#116C0B] bg-[#116C0B]'
                    : 'border-[#D1D5DB] bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    selected ? 'text-white' : 'text-[#374151]'
                  }`}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            alignSelf: 'center',
            maxWidth: 1100,
            paddingBottom: 16,
            paddingHorizontal: horizontalPadding,
            width: '100%',
          }}
        >
          {isLoadingFoods ? (
            <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white p-8">
              <ActivityIndicator color={colors.primary} />
              <Text className="mt-3 text-sm text-[#6B7280]">
                Loading menu...
              </Text>
            </View>
          ) : foodsError ? (
            <View className="items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-8">
              <Text
                accessibilityRole="alert"
                className="text-center text-sm text-[#DC2626]"
              >
                {foodsError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setRetry(value => value + 1)}
                className="rounded-xl bg-[#116C0B] px-4 py-2.5"
              >
                <Text className="font-semibold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : visibleFoods.length ? (
            <View className="flex-row flex-wrap" style={{ gap: cardGap }}>
              {visibleFoods.map(food => {
                const foodLines = cart.filter(
                  line => line.food.id === food.id,
                );
                const quantity = foodLines.reduce(
                  (count, line) => count + line.quantity,
                  0,
                );
                const lastLine = foodLines[foodLines.length - 1];
                return (
                  <View
                    key={food.id}
                    className="rounded-2xl border border-[#E5E7EB] bg-white p-3"
                    style={{ width: cardWidth }}
                  >
                    {food.image ? (
                      <Image
                        accessibilityLabel={`${food.name} image`}
                        className="h-28 w-full rounded-xl bg-[#F3F4F6]"
                        resizeMode="cover"
                        source={{ uri: food.image }}
                      />
                    ) : (
                      <View className="h-28 w-full items-center justify-center rounded-xl bg-[#F0F7EE]">
                        <MenuIcon color={colors.primary} size={28} />
                      </View>
                    )}
                    <Text
                      numberOfLines={1}
                      className="mt-2 text-sm font-bold text-[#012711]"
                    >
                      {food.name}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="mt-0.5 text-xs text-[#6B7280]"
                    >
                      {food.category}
                    </Text>
                    {getFoodOfferDiscount(food) !== null ? (
                      <View className="mt-2 self-start rounded-md bg-[#FFF1E8] px-2 py-1">
                        <Text className="text-[10px] font-bold text-[#C2410C]">
                          {getFoodOfferDiscount(food)}% OFF
                        </Text>
                      </View>
                    ) : null}
                    {quantity ? (
                      <View className="mt-3 gap-2">
                        <Text
                          numberOfLines={1}
                          className="text-sm font-extrabold text-[#012711]"
                        >
                          {food.price === null
                            ? 'Price unavailable'
                            : formatCurrency(food.price)}
                        </Text>
                        <View className="h-9 flex-row items-center self-end rounded-full border border-[#116C0B] bg-white">
                          <Pressable
                            accessibilityLabel={`Remove one ${food.name}`}
                            accessibilityRole="button"
                            onPress={() => {
                              if (lastLine) changeQuantity(lastLine.key, -1);
                            }}
                            className="h-9 w-9 items-center justify-center rounded-full"
                          >
                            <Text className="text-lg font-bold text-[#116C0B]">
                              −
                            </Text>
                          </Pressable>
                          <Text
                            accessibilityLabel={`${quantity} ${food.name} in order`}
                            className="min-w-5 text-center text-sm font-bold text-[#012711]"
                          >
                            {quantity}
                          </Text>
                          <Pressable
                            accessibilityLabel={`Add one ${food.name}`}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: food.price === null }}
                            disabled={food.price === null}
                            onPress={() => addFood(food)}
                            className="h-9 w-9 items-center justify-center rounded-full bg-[#116C0B]"
                          >
                            <PlusIcon color="#FFFFFF" size={16} />
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View className="mt-3 flex-row items-center justify-between gap-2">
                        <Text
                          numberOfLines={1}
                          className="min-w-0 flex-1 text-sm font-extrabold text-[#012711]"
                        >
                          {food.price === null
                            ? 'Price unavailable'
                            : formatCurrency(food.price)}
                        </Text>
                        <Pressable
                          accessibilityLabel={`Add ${food.name} to order`}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: food.price === null }}
                          disabled={food.price === null}
                          onPress={() => addFood(food)}
                          className="h-9 w-9 items-center justify-center rounded-full bg-[#116C0B]"
                        >
                          <PlusIcon color="#FFFFFF" size={18} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white p-8">
              <Text className="text-base font-bold text-[#012711]">
                {search
                  ? 'No foods match your filters'
                  : foodTypeFilter !== 'All'
                    ? `No ${foodTypeFilter} foods available`
                    : foodOfferFilter !== 'All'
                      ? 'No foods currently have an offer'
                    : foodCategoryFilter !== 'All'
                      ? `No ${foodCategoryFilter} foods available`
                    : 'No foods available'}
              </Text>
            </View>
          )}

        </ScrollView>

        <View className="border-t border-[#0B4D1A] bg-[#052E10] px-4 pb-5 pt-1">
          <View className="flex-row items-center justify-between py-2">
            <Text className="text-xs font-semibold text-white/80">
              {cart.reduce((count, line) => count + line.quantity, 0)} items
            </Text>
            <Text className="text-sm font-extrabold text-white">
              Total {formatCurrency(total)}
            </Text>
          </View>
          <View className="flex-row gap-2 pb-0">
            <Pressable
              accessibilityLabel="Preview order bill"
              accessibilityRole="button"
              accessibilityState={{ disabled: cart.length === 0 }}
              disabled={cart.length === 0}
              onPress={() => setIsPreviewOpen(true)}
              className={`h-11 flex-1 items-center justify-center rounded-xl border ${
                cart.length
                  ? 'border-[#116C0B] bg-white'
                  : 'border-[#D1D5DB] bg-[#F3F4F6]'
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  cart.length ? 'text-[#116C0B]' : 'text-[#9CA3AF]'
                }`}
              >
                Bill Preview
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Send ${orderLabel} order to kitchen`}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
              disabled={!canSubmit}
              onPress={sendOrder}
              className={`h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl border ${
                canSubmit
                  ? 'border-white bg-white'
                  : 'border-[#9CA3AF] bg-[#9CA3AF]'
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator
                  size="small"
                  color={canSubmit ? '#052E10' : '#FFFFFF'}
                />
              ) : null}
              <Text
                className={`text-sm font-bold ${
                  canSubmit ? 'text-[#052E10]' : 'text-white'
                }`}
              >
                {isSubmitting ? 'Sending...' : 'KOT'} ({formatCurrency(total)})
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <BaseModal
        accessibilityLabel="Food filters"
        visible={isFoodFilterOpen}
        onClose={() => setIsFoodFilterOpen(false)}
        title="Filter Foods"
        subtitle="Choose food type and category"
        variant="bottom-sheet"
        scrollable
        footer={
          <View className="w-full flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setFoodTypeFilter('All');
                setFoodOfferFilter('All');
                setFoodCategoryFilter('All');
                setMinimumFoodPrice('');
                setMaximumFoodPrice('');
                setMinimumFoodRating(null);
              }}
              className="min-h-12 flex-1 items-center justify-center rounded-xl border border-[#D1D5DB] bg-white"
            >
              <Text className="text-sm font-semibold text-[#475569]">
                Reset
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsFoodFilterOpen(false)}
              className="min-h-12 flex-1 items-center justify-center rounded-xl bg-[#116C0B]"
            >
              <Text className="text-sm font-bold text-white">
                Show {visibleFoods.length} foods
              </Text>
            </Pressable>
          </View>
        }
      >
        <View className="gap-5 p-4">
          <View className="gap-2">
            <Text className="text-sm font-bold text-[#012711]">Offers</Text>
            <View className="flex-row flex-wrap gap-2">
              {(['All', 'Offers'] as const).map(filter => {
                const selected = foodOfferFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setFoodOfferFilter(filter)}
                    className={`min-h-10 items-center justify-center rounded-full border px-4 ${
                      selected
                        ? 'border-[#116C0B] bg-[#116C0B]'
                        : 'border-[#D1D5DB] bg-white'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        selected ? 'text-white' : 'text-[#374151]'
                      }`}
                    >
                      {filter === 'All' ? 'All foods' : 'Offers only'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View className="gap-2">
            <Text className="text-sm font-bold text-[#012711]">Category</Text>
            <View className="flex-row flex-wrap gap-2">
              {['All', ...foodCategories].map(category => {
                const selected =
                  foodCategoryFilter.toLowerCase() === category.toLowerCase();
                return (
                  <Pressable
                    key={category}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setFoodCategoryFilter(category)}
                    className={`min-h-10 items-center justify-center rounded-full border px-4 ${
                      selected
                        ? 'border-[#116C0B] bg-[#116C0B]'
                        : 'border-[#D1D5DB] bg-white'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        selected ? 'text-white' : 'text-[#374151]'
                      }`}
                    >
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View className="gap-2">
            <Text className="text-sm font-bold text-[#012711]">Rating</Text>
            <View className="flex-row flex-wrap gap-2">
              {[
                { label: 'All ratings', value: null },
                { label: '5★', value: 5 },
                { label: '4★ & up', value: 4 },
                { label: '3★ & up', value: 3 },
                { label: '2★ & up', value: 2 },
                { label: '1★ & up', value: 1 },
              ].map(option => {
                const selected = minimumFoodRating === option.value;
                return (
                  <Pressable
                    key={option.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setMinimumFoodRating(option.value)}
                    className={`min-h-10 items-center justify-center rounded-full border px-4 ${
                      selected
                        ? 'border-[#116C0B] bg-[#116C0B]'
                        : 'border-[#D1D5DB] bg-white'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        selected ? 'text-white' : 'text-[#374151]'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View className="gap-2">
            <Text className="text-sm font-bold text-[#012711]">
              Price range
            </Text>
            <View className="flex-row items-center gap-3">
              <View className="min-h-11 flex-1 flex-row items-center rounded-xl border border-[#D1D5DB] bg-white px-3">
                <Text className="mr-2 text-sm text-[#64748B]">₹</Text>
                <TextInput
                  accessibilityLabel="Minimum food price"
                  className="flex-1 py-2 text-sm text-[#111827]"
                  keyboardType="decimal-pad"
                  onChangeText={setMinimumFoodPrice}
                  placeholder="Min price"
                  placeholderTextColor="#64748B"
                  value={minimumFoodPrice}
                />
              </View>
              <Text className="text-sm text-[#64748B]">to</Text>
              <View className="min-h-11 flex-1 flex-row items-center rounded-xl border border-[#D1D5DB] bg-white px-3">
                <Text className="mr-2 text-sm text-[#64748B]">₹</Text>
                <TextInput
                  accessibilityLabel="Maximum food price"
                  className="flex-1 py-2 text-sm text-[#111827]"
                  keyboardType="decimal-pad"
                  onChangeText={setMaximumFoodPrice}
                  placeholder="Max price"
                  placeholderTextColor="#64748B"
                  value={maximumFoodPrice}
                />
              </View>
            </View>
          </View>
        </View>
      </BaseModal>

      <BaseModal
        accessibilityLabel="Order bill preview"
        visible={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Bill Preview"
        subtitle={`${orderLabel}${
          isDineIn ? ` · Table ${text(selectedTable?.table_number)}` : ''
        }`}
        variant="bottom-sheet"
        scrollable
        footer={
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsPreviewOpen(false)}
            className="min-h-12 items-center justify-center rounded-xl bg-[#116C0B]"
          >
            <Text className="text-sm font-bold text-white">Close Preview</Text>
          </Pressable>
        }
      >
        <View className="gap-3 p-4">
          {cart.length ? (
            <View className="gap-2">
              {cart.map(line => (
                <View
                  key={line.key}
                  className="flex-row items-start justify-between gap-3 border-b border-[#E5E7EB] pb-2"
                >
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-semibold text-[#111827]">
                      {line.food.name}
                    </Text>
                    <Text className="mt-1 text-xs text-[#6B7280]">
                      {line.quantity} × {formatCurrency(getLinePrice(line))}
                    </Text>
                  </View>
                  <Text className="text-sm font-bold text-[#111827]">
                    {formatCurrency(getLinePrice(line) * line.quantity)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="py-4 text-center text-sm text-[#6B7280]">
              Add food items to preview this bill.
            </Text>
          )}
          <View className="gap-2 rounded-xl bg-[#F9FAFB] p-3">
            <View className="flex-row justify-between">
              <Text className="text-xs text-[#6B7280]">Subtotal</Text>
              <Text className="text-xs font-semibold text-[#111827]">
                {formatCurrency(subtotal)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-[#6B7280]">Discount</Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs text-[#6B7280]">₹</Text>
                <TextInput
                  accessibilityLabel="Order discount"
                  className="w-20 rounded-lg border border-[#E5E7EB] bg-white px-2 py-1 text-right text-xs text-[#111827]"
                  keyboardType="decimal-pad"
                  onChangeText={setDiscountInput}
                  placeholder="0"
                  placeholderTextColor="#6B7280"
                  value={discountInput}
                />
              </View>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-[#6B7280]">CGST (2.5%)</Text>
              <Text className="text-xs font-semibold text-[#111827]">
                {formatCurrency(cgst)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-[#6B7280]">SGST (2.5%)</Text>
              <Text className="text-xs font-semibold text-[#111827]">
                {formatCurrency(sgst)}
              </Text>
            </View>
            <View className="flex-row justify-between border-t border-[#E5E7EB] pt-2">
              <Text className="text-sm font-bold text-[#012711]">Total</Text>
              <Text className="text-sm font-extrabold text-[#012711]">
                {formatCurrency(total)}
              </Text>
            </View>
          </View>
        </View>
      </BaseModal>

      <BaseModal
        visible={selectedFood !== null}
        onClose={() => setSelectedFood(null)}
        title={selectedFood?.name ?? 'Customize item'}
        subtitle="Choose add-ons and customizations."
        variant="bottom-sheet"
        scrollable
        footer={
          <Pressable
            accessibilityRole="button"
            onPress={addCustomizedFood}
            className="min-h-12 items-center justify-center rounded-xl bg-[#116C0B]"
          >
            <Text className="text-sm font-bold text-white">
              Add to Order
              {selectedFood
                ? ` · ${formatCurrency(
                    (selectedFood.price ?? 0) +
                      selectedFood.addons
                        .filter(addon => selectedAddonIds.includes(addon.id))
                        .reduce((sum, addon) => sum + addon.price, 0) +
                      selectedFood.customizations.reduce(
                        (sum, group) =>
                          sum +
                          group.options
                            .filter(option =>
                              selectedCustomizations[group.id]?.includes(
                                option.id,
                              ),
                            )
                            .reduce(
                              (optionSum, option) => optionSum + option.price,
                              0,
                            ),
                        0,
                      ),
                  )}`
                : ''}
            </Text>
          </Pressable>
        }
      >
        {selectedFood ? (
          <View className="gap-4 p-4">
            {selectedFood.addons.length ? (
              <View className="gap-2">
                <Text className="text-sm font-bold text-[#012711]">
                  Add-ons
                </Text>
                {selectedFood.addons.map(addon => {
                  const selected = selectedAddonIds.includes(addon.id);
                  return (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      key={addon.id}
                      onPress={() =>
                        setSelectedAddonIds(current =>
                          selected
                            ? current.filter(id => id !== addon.id)
                            : [...current, addon.id],
                        )
                      }
                      className={`flex-row items-center justify-between rounded-xl border p-3 ${
                        selected
                          ? 'border-[#116C0B] bg-[#F0F7EE]'
                          : 'border-[#E5E7EB] bg-white'
                      }`}
                    >
                      <Text className="text-xs font-semibold text-[#111827]">
                        {addon.name}
                      </Text>
                      <Text className="text-xs font-bold text-[#116C0B]">
                        + {formatCurrency(addon.price)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {selectedFood.customizations.map(group => (
              <View key={group.id} className="gap-2">
                <Text className="text-sm font-bold text-[#012711]">
                  {group.name}
                  {group.required ? ' *' : ''}
                </Text>
                {group.options.map(option => {
                  const selection = selectedCustomizations[group.id] ?? [];
                  const selected = selection.includes(option.id);
                  return (
                    <Pressable
                      accessibilityRole={
                        group.selectionType === 'Multiple'
                          ? 'checkbox'
                          : 'radio'
                      }
                      accessibilityState={{ checked: selected }}
                      key={option.id}
                      onPress={() =>
                        setSelectedCustomizations(current => ({
                          ...current,
                          [group.id]:
                            group.selectionType === 'Multiple'
                              ? selected
                                ? selection.filter(id => id !== option.id)
                                : [...selection, option.id]
                              : selected
                              ? []
                              : [option.id],
                        }))
                      }
                      className={`flex-row items-center justify-between rounded-xl border p-3 ${
                        selected
                          ? 'border-[#116C0B] bg-[#F0F7EE]'
                          : 'border-[#E5E7EB] bg-white'
                      }`}
                    >
                      <Text className="text-xs font-semibold text-[#111827]">
                        {option.name}
                      </Text>
                      <Text className="text-xs font-bold text-[#116C0B]">
                        {option.price
                          ? `+ ${formatCurrency(option.price)}`
                          : 'Included'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            {customizationError ? (
              <Text
                accessibilityRole="alert"
                className="text-xs text-[#DC2626]"
              >
                {customizationError}
              </Text>
            ) : null}
          </View>
        ) : null}
      </BaseModal>
    </SafeAreaView>
  );
}
