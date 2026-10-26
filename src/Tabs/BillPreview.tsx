import { Pressable, Text, View } from 'react-native';

export type BillPreviewItem = {
  id: string;
  name: string;
  amount: number | null;
};

type BillPreviewProps = {
  items: BillPreviewItem[];
  onRemoveItem: (id: string) => void;
  onReviewBill: () => void;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function BillPreview({ items, onRemoveItem, onReviewBill }: BillPreviewProps) {
  if (items.length === 0) {
    return null;
  }

  const hasUnpricedItems = items.some(item => item.amount === null);
  const total = items.reduce((sum, item) => sum + (item.amount ?? 0), 0);

  return (
    <View className="mb-4 rounded-xl border border-[#E5E7EB] bg-white p-3.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-[#012711]">Bill preview</Text>
        <Text className="text-xs font-semibold text-[#6B7280]">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </Text>
      </View>
      <View className="mt-3 gap-2">
        {items.map(item => (
          <View key={item.id} className="flex-row items-center gap-2">
            <Text numberOfLines={1} className="min-w-0 flex-1 text-sm text-[#374151]">
              {item.name}
            </Text>
            <Text className="text-sm font-semibold text-[#111827]">
              {item.amount === null ? 'Price needed' : formatCurrency(item.amount)}
            </Text>
            <Pressable
              accessibilityLabel={`Remove ${item.name} from bill`}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => onRemoveItem(item.id)}
              className="ml-1 h-7 w-7 items-center justify-center rounded-full bg-[#FEF2F2]"
            >
              <Text className="text-sm font-bold text-[#DC2626]">×</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <View className="mt-3 flex-row items-center justify-between border-t border-[#E5E7EB] pt-3">
        <Text className="text-sm font-bold text-[#111827]">Total</Text>
        <Text className="text-base font-extrabold text-[#111827]">
          {formatCurrency(total)}
        </Text>
      </View>
      {hasUnpricedItems ? (
        <Text className="mt-2 text-xs text-[#B45309]">
          Add a price to each item before creating the invoice.
        </Text>
      ) : null}
      <Pressable
        accessibilityLabel="Review bill"
        accessibilityRole="button"
        disabled={hasUnpricedItems}
        onPress={onReviewBill}
        className={`mt-3 items-center rounded-lg px-4 py-2.5 ${
          hasUnpricedItems ? 'bg-[#D1D5DB]' : 'bg-[#FF5A00]'
        }`}
      >
        <Text className="text-sm font-bold text-white">
          {hasUnpricedItems ? 'Price required' : 'Review bill'}
        </Text>
      </Pressable>
    </View>
  );
}

export default BillPreview;