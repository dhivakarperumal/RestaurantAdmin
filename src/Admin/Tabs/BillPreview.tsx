import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  Share,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlusIcon } from '../Navigation/NavigationIcons';
import { DetailsModal, PrinterIcon } from '../../components/popups';

export type BillPreviewItem = {
  id: string;
  name: string;
  category?: string;
  image?: string;
  amount: number | null;
  quantity: number;
};

type BillPreviewProps = {
  items: BillPreviewItem[];
  onRemoveItem: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onConfirm: () => void;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function BillPreview({
  items,
  onRemoveItem,
  onQuantityChange,
  onConfirm,
}: BillPreviewProps) {
  const [tableNumber, setTableNumber] = useState('T-05');
  const [orderType, setOrderType] = useState<'Dine In' | 'Take Away' | 'Delivery'>('Dine In');
  const [discount, setDiscount] = useState('0');
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false);
  const hasUnpricedItems = items.some(item => item.amount === null);
  const subtotal = items.reduce(
    (sum, item) => sum + (item.amount ?? 0) * item.quantity,
    0,
  );
  const discountAmount = Math.min(
    subtotal,
    Math.max(0, Number(discount.replace(/,/g, '')) || 0),
  );
  const taxableAmount = subtotal - discountAmount;
  const cgst = taxableAmount * 0.025;
  const sgst = taxableAmount * 0.025;
  const grandTotal = taxableAmount + cgst + sgst;
  const now = new Date();
  const billNumber = `BF${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-001`;
  const receiptText = [
    'BUY FOOD',
    `Bill No: ${billNumber}`,
    `Date: ${now.toLocaleDateString('en-GB')}`,
    `Table: ${tableNumber}`,
    `Order Type: ${orderType}`,
    '',
    ...items.map(item =>
      `${item.name}  x${item.quantity}  ${
        item.amount === null
          ? 'Price needed'
          : formatCurrency(item.amount * item.quantity)
      }`,
    ),
    '',
    `Subtotal: ${formatCurrency(subtotal)}`,
    `Discount: ${formatCurrency(discountAmount)}`,
    `CGST: ${formatCurrency(cgst)}`,
    `SGST: ${formatCurrency(sgst)}`,
    `Grand Total: ${formatCurrency(grandTotal)}`,
  ].join('\n');

  const printBill = async () => {
    try {
      await Share.share({ title: `Bill ${billNumber}`, message: receiptText });
    } catch (error) {
      Alert.alert(
        'Unable to open print options',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-white">
      <View className="flex-1">
        <View className="flex-row items-center justify-between bg-[#FF5A00] px-5 py-3.5">
          <View className="flex-row items-center gap-3">
            <Text className="text-2xl font-bold text-white">▤</Text>
            <Text className="text-lg font-extrabold text-white">Invoice / Bill</Text>
          </View>
          <Pressable
            accessibilityLabel="Send bill"
            accessibilityRole="button"
            disabled={hasUnpricedItems || items.length === 0}
            onPress={onConfirm}
            className={`h-11 w-11 items-center justify-center rounded-xl ${
              hasUnpricedItems || items.length === 0 ? 'bg-[#C2410C]' : 'bg-[#E84D00]'
            }`}
          >
            <Text className="text-2xl font-bold text-white">✓</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="flex-row flex-wrap justify-between gap-y-2 px-4 py-3.5">
            <View className="w-[48%] flex-row justify-between gap-1">
              <Text className="text-xs text-[#374151]">Bill No</Text>
              <Text className="text-xs font-bold text-[#111827]">#{billNumber}</Text>
            </View>
            <View className="w-[48%] flex-row justify-between gap-1">
              <Text className="text-xs text-[#374151]">Date</Text>
              <Text className="text-xs font-bold text-[#111827]">
                {now.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <View className="w-[48%] flex-row items-center justify-between gap-1">
              <Text className="text-xs text-[#374151]">Table No</Text>
              <TextInput
                accessibilityLabel="Bill table number"
                className="min-w-[64px] rounded border border-[#E5E7EB] px-2 py-1 text-right text-xs font-bold text-[#111827]"
                onChangeText={setTableNumber}
                value={tableNumber}
              />
            </View>
            <View className="w-[48%] flex-row justify-between gap-1">
              <Text className="text-xs text-[#374151]">Time</Text>
              <Text className="text-xs font-bold text-[#111827]">
                {now.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View className="w-full flex-row items-center justify-between">
              <Text className="text-xs text-[#374151]">Order Type</Text>
              <View className="flex-row gap-1.5">
                {(['Dine In', 'Take Away', 'Delivery'] as const).map(type => (
                  <Pressable
                    accessibilityLabel={`Set order type to ${type}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: orderType === type }}
                    key={type}
                    onPress={() => setOrderType(type)}
                    className={`rounded-md border px-2 py-1 ${
                      orderType === type
                        ? 'border-[#FF5A00] bg-[#FFF7ED]'
                        : 'border-[#E5E7EB] bg-white'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-semibold ${
                        orderType === type ? 'text-[#FF5A00]' : 'text-[#6B7280]'
                      }`}
                    >
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View className="w-[520px] flex-row items-center bg-[#FFF7ED] px-3 py-2.5">
                <Text className="w-8 text-xs font-bold text-[#C2410C]">#</Text>
                <Text className="flex-1 text-xs font-bold text-[#C2410C]">Item</Text>
                <Text className="w-[140px] text-center text-xs font-bold text-[#C2410C]">Qty</Text>
                <Text className="w-[96px] text-right text-xs font-bold text-[#C2410C]">Price / Total</Text>
              </View>
              {items.map((item, index) => {
                const lineTotal = (item.amount ?? 0) * item.quantity;
                return (
                  <View
                    key={item.id}
                    className="w-[520px] flex-row items-center border-b border-[#E5E7EB] px-3 py-2.5"
                  >
                    <Text className="w-8 text-xs text-[#374151]">{index + 1}</Text>
                    {item.image ? (
                      <Image
                        accessibilityLabel={`${item.name} image`}
                        source={{ uri: item.image }}
                        resizeMode="cover"
                        className="mr-2 h-10 w-10 rounded-md bg-[#F3F4F6]"
                      />
                    ) : null}
                    <View className="flex-1">
                      <Text numberOfLines={1} className="text-xs font-bold text-[#111827]">
                        {item.name}
                      </Text>
                      <Text numberOfLines={1} className="mt-0.5 text-[10px] text-[#6B7280]">
                        {item.category || 'Food'}
                      </Text>
                    </View>
                    <View className="w-[140px] flex-row items-center justify-center gap-2">
                      <Pressable
                        accessibilityLabel={`Decrease ${item.name} quantity`}
                        accessibilityRole="button"
                        onPress={() => {
                          if (item.quantity <= 1) {
                            onRemoveItem(item.id);
                          } else {
                            onQuantityChange(item.id, item.quantity - 1);
                          }
                        }}
                        className="h-8 w-8 items-center justify-center rounded-md border border-[#FED7AA]"
                      >
                        <Text className="text-base text-[#EA580C]">−</Text>
                      </Pressable>
                      <Text className="min-w-4 text-center text-xs text-[#111827]">
                        {item.quantity}
                      </Text>
                      <Pressable
                        accessibilityLabel={`Increase ${item.name} quantity`}
                        accessibilityRole="button"
                        onPress={() => onQuantityChange(item.id, item.quantity + 1)}
                        className="h-8 w-8 items-center justify-center rounded-md border border-[#FED7AA]"
                      >
                        <PlusIcon color="#EA580C" size={14} />
                      </Pressable>
                    </View>
                    <View className="w-[96px] items-end">
                      {item.amount === null ? (
                        <Text className="text-[10px] font-semibold text-[#B45309]">Price needed</Text>
                      ) : (
                        <>
                          <Text className="text-[10px] text-[#6B7280]">
                            {formatCurrency(item.amount)} each
                          </Text>
                          <Text className="text-xs font-bold text-[#111827]">
                            {formatCurrency(lineTotal)}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View className="gap-3 px-4 py-4">
            <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-[#374151]">Discount</Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-sm text-[#374151]">₹</Text>
                <TextInput
                  accessibilityLabel="Bill discount"
                  keyboardType="decimal-pad"
                  onChangeText={setDiscount}
                  value={discount}
                  className="w-20 rounded-md border border-[#D1D5DB] px-2 py-1.5 text-right text-sm text-[#111827]"
                />
              </View>
            </View>
            <SummaryRow label="CGST (2.5%)" value={formatCurrency(cgst)} />
            <SummaryRow label="SGST (2.5%)" value={formatCurrency(sgst)} />
          </View>
        </ScrollView>

        {hasUnpricedItems ? (
          <Text className="bg-[#FFFBEB] px-4 py-2 text-center text-xs text-[#B45309]">
            Enter prices for all items before sending the bill.
          </Text>
        ) : null}
        <View className="flex-row items-center justify-between bg-[#FF5A00] px-5 py-3.5">
          <Text className="text-lg font-extrabold text-white">Grand Total</Text>
          <Text className="text-lg font-extrabold text-white">
            {formatCurrency(grandTotal)}
          </Text>
        </View>
        <View className="flex-row gap-3 border-t border-[#E5E7EB] bg-white px-4 py-3">
          <Pressable
            accessibilityLabel="Preview Bill"
            accessibilityRole="button"
            onPress={() => setIsReceiptPreviewOpen(true)}
            className="h-12 flex-1 items-center justify-center rounded-xl border border-[#FF5A00] bg-white"
          >
            <Text className="text-sm font-bold text-[#EA580C]">Preview Bill</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Print Bill"
            accessibilityRole="button"
            onPress={printBill}
            className="h-12 flex-1 items-center justify-center rounded-xl bg-[#FF5A00]"
          >
            <Text className="text-sm font-bold text-white">Print Bill</Text>
          </Pressable>
        </View>
      </View>
      <DetailsModal
        visible={isReceiptPreviewOpen}
        onClose={() => setIsReceiptPreviewOpen(false)}
        title="Bill Preview"
        subtitle={`Invoice #${billNumber}`}
        icon={<PrinterIcon size={22} color="#116C0B" />}
        badge={{
          label: orderType,
          bg: '#F0FDF4',
          text: '#116C0B',
          border: '#DCFCE7',
        }}
        maxWidth={500}
        footer={
          <View className="w-full flex-row gap-3">
            <Pressable
              accessibilityLabel="Close bill preview"
              accessibilityRole="button"
              onPress={() => setIsReceiptPreviewOpen(false)}
              className="min-h-12 flex-1 items-center justify-center rounded-2xl border border-[#CBD5E1] bg-white active:bg-gray-100"
            >
              <Text className="text-sm font-semibold text-[#334155]">Close</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Print or Share Bill"
              accessibilityRole="button"
              onPress={() => {
                setIsReceiptPreviewOpen(false);
                printBill();
              }}
              className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] active:bg-[#EA580C]"
            >
              <PrinterIcon size={18} color="#FFFFFF" />
              <Text className="text-sm font-bold text-white">Print / Share</Text>
            </Pressable>
          </View>
        }
      >
        <View className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <Text className="font-mono text-xs leading-5 text-[#334155]">{receiptText}</Text>
        </View>
      </DetailsModal>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-[#374151]">{label}</Text>
      <Text className="text-sm font-semibold text-[#111827]">{value}</Text>
    </View>
  );
}

export default BillPreview;
