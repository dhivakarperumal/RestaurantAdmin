import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePrinterSettings } from './hooks/usePrinterSettings';
import type {
  ConnectionType,
  PrinterModel,
  PaperSize,
} from './hooks/usePrinterSettings';
import { PrinterToggle } from './components/PrinterToggle';
import { PrinterSelect } from './components/PrinterSelect';
import { UsbPanel } from './panels/UsbPanel';
import { NetworkPanel } from './panels/NetworkPanel';
import { BluetoothPanel } from './panels/BluetoothPanel';
import {
  ArrowLeftIcon,
  PrinterIcon,
  SaveIcon,
} from './components/PrinterIcons';

const PRINTER_MODELS: PrinterModel[] = [
  'EPSON TM-T82',
  'TVS RP 3150',
  'Generic POS Printer',
];
const CONNECTION_TYPES: ConnectionType[] = [
  'USB',
  'LAN / Network',
  'Bluetooth',
  'Wi-Fi',
];
const PAPER_SIZES: PaperSize[] = ['58mm', '80mm', 'A4'];

type PrinterSetupScreenProps = {
  onBack: () => void;
  showHeader?: boolean;
};

export default function PrinterSetupScreen({
  onBack,
  showHeader = true,
}: PrinterSetupScreenProps) {
  const { settings, setSettings, loading, saving, save } = usePrinterSettings();
  const { width } = useWindowDimensions();
  const isWide = width >= 720;

  const update = useCallback(
    <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
      setSettings(prev => ({ ...prev, [key]: value }));
    },
    [setSettings],
  );

  const handleSave = async () => {
    const success = await save(settings);
    if (success) {
      Alert.alert('Saved', 'Printer settings saved successfully.');
    } else {
      Alert.alert(
        'Error',
        'Failed to save printer settings. Please try again.',
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        edges={showHeader ? ['top', 'bottom'] : []}
        className="flex-1 items-center justify-center bg-[#F8FAFC]"
      >
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF5EE]">
          <ActivityIndicator size="large" color="#116C0B" />
        </View>
        <Text className="mt-4 text-base font-bold text-[#0F172A]">
          Loading printer settings
        </Text>
        <Text className="mt-1 text-sm text-[#64748B]">
          Fetching your saved configuration...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={showHeader ? ['top', 'bottom'] : []}
      className="flex-1 bg-[#F8FAFC]"
    >
      {showHeader ? (
        <View className="flex-row items-center gap-3 border-b border-[#E2E8F0] bg-white px-4 py-3">
          <Pressable
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-9 w-9 items-center justify-center rounded-xl bg-[#F1F5F9]"
          >
            <ArrowLeftIcon size={18} />
          </Pressable>
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6FF]">
            <PrinterIcon size={20} color="#116C0B" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-[#0F172A]">
              Printer Setup
            </Text>
            <Text className="mt-0.5 text-[11px] text-[#6B7280]">
              Configure receipt and kitchen printers
            </Text>
          </View>
        </View>
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          alignSelf: 'center',
          gap: 16,
          maxWidth: 920,
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 28,
          width: '100%',
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="rounded-3xl border border-[#DDEBE0] bg-white p-5">
          <View className="mb-5">
            <Text className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#15803D]">
              Device preferences
            </Text>
            <Text className="mt-2 text-2xl font-extrabold text-[#102A1A]">
              Printer setup
            </Text>
            <Text className="mt-1 text-sm leading-5 text-[#64748B]">
              Set up how receipts and kitchen orders are printed at your
              restaurant.
            </Text>
          </View>
          <View
            className={isWide ? 'flex-row gap-4' : 'gap-0'}
            style={isWide ? { zIndex: 2 } : undefined}
          >
            <PrinterSelect
              label="Printer model"
              options={PRINTER_MODELS}
              value={settings.printerModel}
              onChange={v => update('printerModel', v)}
            />
            <PrinterSelect
              label="Connection type"
              options={CONNECTION_TYPES}
              value={settings.connectionType}
              onChange={v => update('connectionType', v)}
            />
          </View>

          {settings.connectionType === 'USB' ? <UsbPanel /> : null}

          {settings.connectionType === 'LAN / Network' ||
          settings.connectionType === 'Wi-Fi' ? (
            <NetworkPanel
              type={settings.connectionType}
              ip={settings.ip}
              port={settings.port}
              onChangeIp={v => update('ip', v)}
              onChangePort={v => update('port', v)}
            />
          ) : null}

          {settings.connectionType === 'Bluetooth' ? (
            <BluetoothPanel
              pairedDevices={settings.pairedDevices}
              onPairedDevicesChange={devices =>
                update('pairedDevices', devices)
              }
            />
          ) : null}
        </View>

        <View className="rounded-3xl border border-[#E2E8F0] bg-white p-5">
          <SectionHeading
            title="Paper & copies"
            subtitle="Choose the receipt format and number of printouts."
          />
          <View className={isWide ? 'flex-row gap-4' : 'gap-0'}>
            <PrinterSelect
              label="Paper Size"
              options={PAPER_SIZES}
              value={settings.paperSize}
              onChange={v => update('paperSize', v)}
            />
            <PrinterSelect
              label="Print Copies"
              options={['1', '2', '3']}
              value={settings.printCopies}
              onChange={v => update('printCopies', v)}
            />
          </View>
        </View>

        <View>
          <SectionHeading
            title="Print options"
            subtitle="Fine-tune what appears on receipts and kitchen tickets."
          />
          <View className={isWide ? 'flex-row flex-wrap gap-4' : 'gap-4'}>
            <View className="flex-1 basis-[300px] rounded-3xl border border-[#E2E8F0] bg-white px-4">
              <Text className="pt-4 text-sm font-bold text-[#0F172A]">
                Receipts & checkout
              </Text>
              <Text className="mt-1 pb-1 text-xs leading-5 text-[#64748B]">
                Receipt automation and branding.
              </Text>
              <PrinterToggle
                label="Auto-print receipt"
                description="Print automatically after checkout."
                value={settings.autoPrint}
                onChange={v => update('autoPrint', v)}
              />
              <PrinterToggle
                label="Cash drawer trigger"
                description="Open the cash drawer after payment."
                value={settings.cashDrawer}
                onChange={v => update('cashDrawer', v)}
              />
              <PrinterToggle
                label="Print logo"
                description="Include your restaurant logo."
                value={settings.printLogo}
                onChange={v => update('printLogo', v)}
              />
              <PrinterToggle
                label="Print header"
                description="Show the receipt header."
                value={settings.printHeader}
                onChange={v => update('printHeader', v)}
              />
              <PrinterToggle
                label="Print footer"
                description="Show the receipt footer."
                value={settings.printFooter}
                onChange={v => update('printFooter', v)}
                isLast
              />
            </View>

            <View className="flex-1 basis-[300px] rounded-3xl border border-[#E2E8F0] bg-white px-4">
              <Text className="pt-4 text-sm font-bold text-[#0F172A]">
                Kitchen & labels
              </Text>
              <Text className="mt-1 pb-1 text-xs leading-5 text-[#64748B]">
                Enable kitchen tickets and scannable codes.
              </Text>
              <PrinterToggle
                label="Kitchen order printer"
                description="Send incoming orders to the kitchen."
                value={settings.kitchenPrinter}
                onChange={v => update('kitchenPrinter', v)}
              />
              <PrinterToggle
                label="Barcode printing"
                description="Add barcodes to printed documents."
                value={settings.barcodePrinting}
                onChange={v => update('barcodePrinting', v)}
              />
              <PrinterToggle
                label="QR code printing"
                description="Add QR codes to printed documents."
                value={settings.qrPrinting}
                onChange={v => update('qrPrinting', v)}
                isLast
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="border-t border-[#E2E8F0] bg-white px-5 pb-4 pt-3">
        <View
          className="flex-row gap-3"
          style={{
            alignSelf: 'center',
            maxWidth: 880,
            width: '100%',
          }}
        >
          <Pressable
            onPress={onBack}
            className="min-h-12 flex-1 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-4 py-3"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text className="text-sm font-bold text-[#475569]">Cancel</Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            className="min-h-12 flex-[2] flex-row items-center justify-center gap-2 rounded-xl bg-[#116C0B] px-4 py-3"
            style={({ pressed }) => ({
              opacity: saving || pressed ? 0.75 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel="Save printer settings"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <SaveIcon size={16} color="#FFFFFF" />
            )}
            <Text className="text-sm font-bold text-white">
              {saving ? 'Saving...' : 'Save Settings'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View className="mb-4">
      <Text className="text-base font-extrabold text-[#102A1A]">{title}</Text>
      <Text className="mt-1 text-xs leading-5 text-[#64748B]">{subtitle}</Text>
    </View>
  );
}
