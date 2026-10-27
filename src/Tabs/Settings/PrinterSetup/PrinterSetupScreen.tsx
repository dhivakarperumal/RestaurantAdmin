import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePrinterSettings } from './hooks/usePrinterSettings';
import type { ConnectionType, PrinterModel, PaperSize } from './hooks/usePrinterSettings';
import { PrinterToggle } from './components/PrinterToggle';
import { PrinterSelect } from './components/PrinterSelect';
import { UsbPanel } from './panels/UsbPanel';
import { NetworkPanel } from './panels/NetworkPanel';
import { BluetoothPanel } from './panels/BluetoothPanel';
import { ArrowLeftIcon, PrinterIcon, SaveIcon } from './components/PrinterIcons';

const PRINTER_MODELS: PrinterModel[] = ['EPSON TM-T82', 'TVS RP 3150', 'Generic POS Printer'];
const CONNECTION_TYPES: ConnectionType[] = ['USB', 'LAN / Network', 'Bluetooth', 'Wi-Fi'];
const PAPER_SIZES: PaperSize[] = ['58mm', '80mm', 'A4'];

type PrinterSetupScreenProps = {
  onBack: () => void;
};

export default function PrinterSetupScreen({ onBack }: PrinterSetupScreenProps) {
  const { settings, setSettings, loading, saving, fetchError, save } = usePrinterSettings();

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
      Alert.alert('Error', 'Failed to save printer settings. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F8FAFC]">
        <ActivityIndicator size="large" color="#116C0B" />
        <Text className="mt-3 text-sm text-[#6B7280]">Loading printer settings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-[#F8FAFC]">
      {/* ── Header ── */}
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
        <View>
          <Text className="text-base font-bold text-[#0F172A]">Printer Setup</Text>
          <Text className="text-[11px] text-[#6B7280]">Configure receipt and kitchen printers</Text>
        </View>
      </View>

      {/* ── Body ── */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-6 pt-5"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* API fetch error banner — only shown for unexpected errors, not missing endpoints */}
        {fetchError ? null : null}

        {/* ── Section: Printer Model & Connection ── */}
        <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
          Printer Configuration
        </Text>

        <PrinterSelect
          label="Printer Model"
          options={PRINTER_MODELS}
          value={settings.printerModel}
          onChange={v => update('printerModel', v)}
        />

        <PrinterSelect
          label="Connection Type"
          options={CONNECTION_TYPES}
          value={settings.connectionType}
          onChange={v => update('connectionType', v)}
        />

        {/* ── Dynamic connection panel ── */}
        {settings.connectionType === 'USB' && <UsbPanel />}

        {(settings.connectionType === 'LAN / Network' || settings.connectionType === 'Wi-Fi') && (
          <NetworkPanel
            type={settings.connectionType}
            ip={settings.ip}
            port={settings.port}
            onChangeIp={v => update('ip', v)}
            onChangePort={v => update('port', v)}
          />
        )}

        {settings.connectionType === 'Bluetooth' && (
          <BluetoothPanel
            pairedDevices={settings.pairedDevices}
            onPairedDevicesChange={devices => update('pairedDevices', devices)}
          />
        )}

        {/* ── Section: Paper & Copies ── */}
        <View className="mt-6">
          <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
            Paper Settings
          </Text>
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

        {/* ── Section: Print Options (Toggles) ── */}
        <View className="mt-4">
          <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
            Print Options
          </Text>
          <View className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-1">
            <PrinterToggle label="Auto-print Receipt" value={settings.autoPrint} onChange={v => update('autoPrint', v)} />
            <PrinterToggle label="Cash Drawer Trigger" value={settings.cashDrawer} onChange={v => update('cashDrawer', v)} />
            <PrinterToggle label="Kitchen Order Printer" value={settings.kitchenPrinter} onChange={v => update('kitchenPrinter', v)} />
            <PrinterToggle label="Barcode Printing" value={settings.barcodePrinting} onChange={v => update('barcodePrinting', v)} />
            <PrinterToggle label="QR Code Printing" value={settings.qrPrinting} onChange={v => update('qrPrinting', v)} />
            <PrinterToggle label="Print Logo" value={settings.printLogo} onChange={v => update('printLogo', v)} />
            <PrinterToggle label="Print Header" value={settings.printHeader} onChange={v => update('printHeader', v)} />
            <PrinterToggle label="Print Footer" value={settings.printFooter} onChange={v => update('printFooter', v)} />
          </View>
        </View>

        <View className="h-4" />
      </ScrollView>

      {/* ── Footer action bar ── */}
      <View className="flex-row gap-3 border-t border-[#E2E8F0] bg-white px-4 pb-4 pt-3">
        <Pressable
          onPress={onBack}
          className="flex-1 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] py-3"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text className="text-sm font-semibold text-[#64748B]">Cancel</Text>
        </Pressable>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="flex-[2] flex-row items-center justify-center gap-2 rounded-xl bg-[#116C0B] py-3"
          style={({ pressed }) => ({ opacity: saving || pressed ? 0.75 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Save printer settings"
        >
          {saving
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <SaveIcon size={16} color="#FFFFFF" />}
          <Text className="text-sm font-bold text-white">
            {saving ? 'Saving...' : 'Save Settings'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
