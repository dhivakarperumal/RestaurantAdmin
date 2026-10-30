import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import api from '../../../api';
import { FormModal } from '../../components/popups';
import type { AdminTableRecord } from '../Navigation/DashboardTypes';

type BillRecord = Record<string, unknown>;

type ActiveBillChoice = {
  billId: string;
  tableId: string;
  tableNumber: string;
};

type PreviewItem = {
  key: string;
  name: string;
  quantity: number;
  unitPrice: number | null;
  total: number | null;
};

type BillPreview = {
  choice: ActiveBillChoice;
  subtotal: number | null;
  tax: number | null;
  discount: number | null;
  total: number | null;
  items: PreviewItem[];
};

function isRecord(value: unknown): value is BillRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRecords(payload: unknown, depth = 0): BillRecord[] {
  if (depth > 5) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }
  if (!isRecord(payload)) {
    return [];
  }
  for (const key of ['bills', 'table_bills', 'data']) {
    if (key in payload) {
      const records = readRecords(payload[key], depth + 1);
      if (records.length || Array.isArray(payload[key])) {
        return records;
      }
    }
  }
  return [];
}

function readBill(payload: unknown): BillRecord | null {
  let current = payload;
  for (let depth = 0; depth < 5; depth += 1) {
    if (!isRecord(current)) {
      return null;
    }
    if (isRecord(current.bill)) {
      current = current.bill;
    } else if (isRecord(current.data)) {
      current = current.data;
    } else {
      return current;
    }
  }
  return null;
}

function text(value: unknown) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
}

function amount(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value !== 'number' && typeof value !== 'string') {
      continue;
    }
    const parsed = Number(String(value).replace(/[^0-9.-]+/g, ''));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function canonicalValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalValue).sort().join(',')}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonicalValue(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? '';
}

function tableIdentifier(table: AdminTableRecord) {
  return table.table_id ?? table.id;
}

function getBillItems(bill: BillRecord) {
  const rounds = Array.isArray(bill.rounds) ? bill.rounds : [];
  const roundItems = rounds.flatMap(round =>
    isRecord(round) && Array.isArray(round.items)
      ? round.items.filter(isRecord)
      : [],
  );
  const items = roundItems.length
    ? roundItems
    : ['consolidated_items', 'items', 'order_items']
        .map(key => bill[key])
        .find(Array.isArray);
  return (Array.isArray(items) ? items : []).filter(isRecord);
}

function readPreviewItems(bill: BillRecord): PreviewItem[] {
  return getBillItems(bill).map(item => {
    const quantity = amount(item.quantity) ?? 1;
    const total = amount(item.total_price, item.line_total);
    const unitPrice =
      amount(item.unit_price, item.price) ??
      (total === null || quantity <= 0 ? null : total / quantity);
    const name = text(
      item.food_name ??
        item.product_name ??
        item.item_name ??
        item.name,
    ) || 'Food item';
    const key = [
      text(item.food_id ?? item.product_id ?? item.id) || name.toLowerCase(),
      unitPrice ?? '',
      canonicalValue(item.selected_addons ?? item.addons),
      canonicalValue(item.selected_customizations ?? item.customizations),
    ].join('|');
    return {
      key,
      name,
      quantity,
      unitPrice,
      total: total ?? (unitPrice === null ? null : unitPrice * quantity),
    };
  });
}

function formatCurrency(value: number | null) {
  return value === null
    ? '—'
    : `₹${value.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
}

function getErrorMessage(error: unknown) {
  return isRecord(error) && typeof error.message === 'string'
    ? error.message
    : 'The table bills could not be loaded.';
}

export default function TableMergeModal({
  visible,
  tables,
  primaryTableId: preferredPrimaryTableId,
  onClose,
  onMerged,
}: {
  visible: boolean;
  tables: AdminTableRecord[];
  primaryTableId?: string;
  onClose: () => void;
  onMerged: () => void;
}) {
  const [choices, setChoices] = useState<ActiveBillChoice[]>([]);
  const [primaryTableId, setPrimaryTableId] = useState('');
  const [sourceTableIds, setSourceTableIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<BillPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedChoices = useMemo(() => {
    const selectedIds = new Set([primaryTableId, ...sourceTableIds]);
    return choices.filter(choice => selectedIds.has(choice.tableId));
  }, [choices, primaryTableId, sourceTableIds]);
  const selectionKey = selectedChoices
    .map(choice => choice.tableId)
    .sort()
    .join('|');
  const previewMatchesSelection =
    preview.length === selectedChoices.length &&
    preview.map(item => item.choice.tableId).sort().join('|') === selectionKey;
  const combinedItems = useMemo(() => {
    const grouped = new Map<string, PreviewItem>();
    for (const bill of preview) {
      for (const item of bill.items) {
        const key = item.key;
        const current = grouped.get(key);
        if (current) {
          current.quantity += item.quantity;
          current.total =
            current.total === null || item.total === null
              ? null
              : current.total + item.total;
        } else {
          grouped.set(key, { ...item, key });
        }
      }
    }
    return Array.from(grouped.values());
  }, [preview]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let active = true;
    setIsLoading(true);
    setErrorMessage('');
    setPreview([]);
    api
      .get('/table-bills', { params: { status: 'Active' } })
      .then(response => {
        if (!active) {
          return;
        }
        if (
          isRecord(response.data) &&
          response.data.success === false
        ) {
          throw new Error(
            typeof response.data.message === 'string'
              ? response.data.message
              : 'Active table bills could not be loaded.',
          );
        }
        const nextChoices = readRecords(response.data).flatMap(bill => {
          const billId = text(bill.bill_id ?? bill.id);
          const billTableId = bill.table_id;
          const table = tables.find(candidate => {
            const id = tableIdentifier(candidate);
            if (billTableId !== undefined && billTableId !== null) {
              return id !== undefined && String(id) === String(billTableId);
            }
            return (
              bill.table_number !== undefined &&
              String(candidate.table_number) === String(bill.table_number)
            );
          });
          const id = table && tableIdentifier(table);
          if (!billId || id === undefined || id === null || !table) {
            return [];
          }
          return [
            {
              billId,
              tableId: String(id),
              tableNumber: text(table.table_number) || '—',
            },
          ];
        });
        setChoices(nextChoices);
        const preferredChoice = nextChoices.find(
          choice => choice.tableId === preferredPrimaryTableId,
        );
        setPrimaryTableId(
          preferredChoice?.tableId ?? nextChoices[0]?.tableId ?? '',
        );
        setSourceTableIds([]);
      })
      .catch(error => {
        if (active) {
          setErrorMessage(getErrorMessage(error));
          setChoices([]);
          setPrimaryTableId('');
          setSourceTableIds([]);
          setPreview([]);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [preferredPrimaryTableId, tables, visible]);

  const toggleSource = (tableId: string) => {
    setPreview([]);
    setSourceTableIds(current =>
      current.includes(tableId)
        ? current.filter(id => id !== tableId)
        : [...current, tableId],
    );
  };

  const choosePrimary = (tableId: string) => {
    setPreview([]);
    setPrimaryTableId(tableId);
    setSourceTableIds(current => current.filter(id => id !== tableId));
  };

  const fetchPreviewDetails = async (billChoices: ActiveBillChoice[]) =>
    Promise.all(
      billChoices.map(async choice => {
        const response = await api.get(
          `/table-bills/${encodeURIComponent(choice.billId)}`,
        );
        if (isRecord(response.data) && response.data.success === false) {
          throw new Error(
            typeof response.data.message === 'string'
              ? response.data.message
              : `Unable to load the bill for Table ${choice.tableNumber}.`,
          );
        }
        const bill = readBill(response.data);
        if (!bill) {
          throw new Error(
            `Unable to load the bill for Table ${choice.tableNumber}.`,
          );
        }
        const items = readPreviewItems(bill);
        const itemSubtotal = items.every(item => item.total !== null)
          ? items.reduce((sum, item) => sum + (item.total ?? 0), 0)
          : null;
        const cgst = amount(bill.cgst_amount, bill.cgst);
        const sgst = amount(bill.sgst_amount, bill.sgst);
        const subtotal =
          amount(bill.subtotal, bill.sub_total) ?? itemSubtotal;
        const discount =
          amount(bill.discount_amount, bill.discount, bill.total_discount) ??
          0;
        const tax =
          amount(bill.tax_amount, bill.total_tax, bill.tax_total, bill.tax) ??
          (cgst === null && sgst === null ? null : (cgst ?? 0) + (sgst ?? 0));
        return {
          choice,
          subtotal,
          tax,
          discount,
          total:
            amount(bill.grand_total, bill.total_amount, bill.total) ??
            (subtotal !== null && tax !== null
              ? subtotal - discount + tax
              : null),
          items,
        };
      }),
    );

  const loadPreview = async () => {
    if (!primaryTableId || sourceTableIds.length === 0) {
      setErrorMessage('Choose a primary table and at least one table to merge.');
      return;
    }
    setIsPreviewing(true);
    setErrorMessage('');
    try {
      setPreview(await fetchPreviewDetails(selectedChoices));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsPreviewing(false);
    }
  };

  const mergeBills = async () => {
    const primary = choices.find(choice => choice.tableId === primaryTableId);
    if (!primary || !sourceTableIds.length || isMerging || isPreviewing) {
      return;
    }
    setIsMerging(true);
    setErrorMessage('');
    try {
      if (!previewMatchesSelection) {
        setPreview(await fetchPreviewDetails(selectedChoices));
      }
      const response = await api.post('/table-bills/merge', {
        primary_table_id: primary.tableId,
        merge_table_ids: sourceTableIds,
      });
      if (isRecord(response.data) && response.data.success === false) {
        throw new Error(
          typeof response.data.message === 'string'
            ? response.data.message
            : 'The selected table bills could not be merged.',
        );
      }
      onMerged();
      onClose();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsMerging(false);
    }
  };

  const sumField = (field: 'subtotal' | 'tax' | 'discount' | 'total') =>
    preview.every(bill => bill[field] !== null)
      ? preview.reduce((sum, bill) => sum + (bill[field] ?? 0), 0)
      : null;
  const combinedSubtotal = sumField('subtotal');
  const combinedTax = sumField('tax');
  const combinedDiscount = sumField('discount');
  const combinedTotal = sumField('total');

  return (
    <FormModal
      visible={visible}
      onClose={onClose}
      title="Merge active table bills"
      subtitle="Choose the table that will keep the combined bill, then select the bills to merge into it."
      onSave={mergeBills}
      saveLabel="Merge bills"
      cancelLabel="Cancel"
      isSaving={isMerging}
      isSaveDisabled={
        isLoading ||
        isPreviewing ||
        !primaryTableId ||
        sourceTableIds.length === 0
      }
      errorMessage={errorMessage}
      maxWidth={620}
      maxHeightPercent={92}
      footerExtra={
        <Pressable
          accessibilityRole="button"
          disabled={
            isLoading ||
            isPreviewing ||
            !primaryTableId ||
            sourceTableIds.length === 0
          }
          onPress={loadPreview}
          className="min-h-11 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-4"
        >
          {isPreviewing ? (
            <ActivityIndicator color="#116C0B" size="small" />
          ) : (
            <Text className="text-sm font-bold text-[#116C0B]">
              Preview merge
            </Text>
          )}
        </Pressable>
      }
      contentContainerStyle={{ gap: 12, padding: 14 }}
    >
      {isLoading ? (
        <View className="items-center gap-2 py-6">
          <ActivityIndicator color="#116C0B" />
          <Text className="text-sm text-[#64748B]">Loading active bills…</Text>
        </View>
      ) : choices.length < 2 ? (
        <Text className="py-4 text-sm text-[#64748B]">
          At least two tables with active bills are required to merge.
        </Text>
      ) : (
        <View className="gap-2">
          {choices.map(choice => {
            const isPrimary = choice.tableId === primaryTableId;
            const isSource = sourceTableIds.includes(choice.tableId);
            return (
              <View
                key={choice.tableId}
                className="flex-row items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white p-3"
              >
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-bold text-[#0F172A]">
                    Table {choice.tableNumber}
                  </Text>
                  <Text className="mt-1 text-[11px] text-[#64748B]">
                    Bill #{choice.billId}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isPrimary }}
                  onPress={() => choosePrimary(choice.tableId)}
                  className={`rounded-lg px-3 py-2 ${
                    isPrimary ? 'bg-[#116C0B]' : 'bg-[#F1F5F9]'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isPrimary ? 'text-white' : 'text-[#334155]'
                    }`}
                  >
                    {isPrimary ? 'Primary' : 'Make primary'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    checked: isSource,
                    disabled: isPrimary,
                  }}
                  disabled={isPrimary}
                  onPress={() => toggleSource(choice.tableId)}
                  className={`rounded-lg px-3 py-2 ${
                    isSource ? 'bg-[#FEF3C7]' : 'bg-[#F1F5F9]'
                  }`}
                >
                  <Text className="text-xs font-bold text-[#334155]">
                    {isSource ? 'Selected' : 'Merge'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
      {previewMatchesSelection && preview.length ? (
        <View className="gap-2 rounded-xl border border-[#DCE8D8] bg-[#F8FCF7] p-3">
          <Text className="text-sm font-bold text-[#0F172A]">
            Combined preview
          </Text>
          <View className="gap-1 border-b border-[#DCE8D8] pb-2">
            <Text className="text-xs text-[#475569]">
              Subtotal {formatCurrency(combinedSubtotal)}
            </Text>
            <Text className="text-xs text-[#475569]">
              Discount {formatCurrency(combinedDiscount)}
            </Text>
            <Text className="text-xs text-[#475569]">
              Tax {formatCurrency(combinedTax)}
            </Text>
            <Text className="text-sm font-bold text-[#0F172A]">
              Total {formatCurrency(combinedTotal)}
            </Text>
          </View>
          <Text className="mt-1 text-xs font-bold text-[#334155]">
            Combined items
          </Text>
          {combinedItems.map(item => (
            <View
              key={item.key}
              className="flex-row items-center justify-between gap-3"
            >
              <Text className="flex-1 text-xs text-[#475569]">
                {item.name} × {item.quantity}
              </Text>
              <Text className="text-xs font-semibold text-[#334155]">
                {formatCurrency(item.total)}
              </Text>
            </View>
          ))}
          <Text className="mt-1 text-xs font-bold text-[#334155]">
            Source bills
          </Text>
          {preview.map(bill => (
            <View
              key={bill.choice.tableId}
              className="flex-row justify-between gap-2"
            >
              <Text className="text-xs font-bold text-[#334155]">
                Table {bill.choice.tableNumber}
              </Text>
              <Text className="text-xs text-[#64748B]">
                {formatCurrency(bill.total)}
              </Text>
            </View>
          ))}
          <Text className="text-[10px] text-[#64748B]">
            The server validates and recalculates the merged bill before saving.
          </Text>
        </View>
      ) : null}
    </FormModal>
  );
}
