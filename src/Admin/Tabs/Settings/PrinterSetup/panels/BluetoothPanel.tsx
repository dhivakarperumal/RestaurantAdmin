import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { BluetoothIcon, PrinterIcon } from '../components/PrinterIcons';
import type { BluetoothDevice } from '../hooks/usePrinterSettings';

const MOCK_AVAILABLE: BluetoothDevice[] = [
  { id: 'dev2', name: 'TVS RP3150', mac: 'A1:B2:C3:D4:E5:F6' },
  { id: 'dev3', name: 'Generic BT Printer', mac: 'B2:C3:D4:E5:F6:A1' },
];

type BluetoothPanelProps = {
  pairedDevices: BluetoothDevice[];
  onPairedDevicesChange: (devices: BluetoothDevice[]) => void;
};

export function BluetoothPanel({ pairedDevices, onPairedDevicesChange }: BluetoothPanelProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<BluetoothDevice[]>([
    { id: 'dev1', name: 'POS-58 Receipt Printer', mac: '00:11:22:33:44:55' },
  ]);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      // Merge mock devices not already in paired list
      const pairedIds = pairedDevices.map(d => d.id);
      const freshAvailable = MOCK_AVAILABLE.filter(d => !pairedIds.includes(d.id));
      setAvailableDevices(current => {
        const currentIds = current.map(d => d.id);
        const merged = [...current];
        freshAvailable.forEach(d => {
          if (!currentIds.includes(d.id)) merged.push(d);
        });
        return merged.filter(d => !pairedIds.includes(d.id));
      });
      setIsScanning(false);
    }, 2500);
  };

  const handlePair = (device: BluetoothDevice) => {
    setAvailableDevices(prev => prev.filter(d => d.id !== device.id));
    onPairedDevicesChange([...pairedDevices, device]);
  };

  const handleUnpair = (device: BluetoothDevice) => {
    onPairedDevicesChange(pairedDevices.filter(d => d.id !== device.id));
    setAvailableDevices(prev => [...prev, device]);
  };

  return (
    <View className="mt-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      {/* Header */}
      <View className="mb-5 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <BluetoothIcon size={18} color="#3B82F6" />
          <Text className="font-bold text-[#0F172A]">Bluetooth Printers</Text>
        </View>
        <Pressable
          onPress={handleScan}
          disabled={isScanning}
          className="rounded-lg bg-[#EFF6FF] px-3 py-1.5"
          style={({ pressed }) => ({ opacity: pressed || isScanning ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Scan for Bluetooth devices"
        >
          <Text className="text-sm font-bold text-[#2563EB]">
            {isScanning ? 'Scanning...' : 'Scan Devices'}
          </Text>
        </Pressable>
      </View>

      {/* Paired Devices */}
      <Text className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
        Paired Devices
      </Text>
      {pairedDevices.length === 0 ? (
        <Text className="mb-4 text-sm text-[#94A3B8]">No paired devices</Text>
      ) : (
        <View className="mb-4 gap-2">
          {pairedDevices.map(device => (
            <View
              key={device.id}
              className="flex-row items-center justify-between rounded-xl border border-[#E2E8F0] bg-white p-3"
              style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#F0FDF4]">
                  <PrinterIcon size={18} color="#10B981" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-[#1E293B]">{device.name}</Text>
                  <Text className="text-xs text-[#94A3B8]">{device.mac}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="rounded-md bg-[#D1FAE5] px-2 py-0.5">
                  <Text className="text-[11px] font-bold text-[#10B981]">Connected</Text>
                </View>
                <Pressable
                  onPress={() => handleUnpair(device)}
                  className="px-1 py-1"
                  accessibilityRole="button"
                  accessibilityLabel={`Unpair ${device.name}`}
                >
                  <Text className="text-sm font-bold text-[#EF4444]">Unpair</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Available Devices */}
      <Text className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
        Available Devices
      </Text>
      {isScanning ? (
        <View className="items-center py-4">
          <ActivityIndicator color="#3B82F6" />
          <Text className="mt-2 text-sm text-[#64748B]">Searching for nearby printers...</Text>
        </View>
      ) : availableDevices.filter(d => !pairedDevices.find(p => p.id === d.id)).length === 0 ? (
        <Text className="py-4 text-center text-sm text-[#94A3B8]">No available devices found. Tap Scan Devices.</Text>
      ) : (
        <View className="gap-2">
          {availableDevices
            .filter(d => !pairedDevices.find(p => p.id === d.id))
            .map(device => (
              <View
                key={device.id}
                className="flex-row items-center justify-between rounded-xl border border-[#E2E8F0] bg-white p-3"
                style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }}
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6FF]">
                    <PrinterIcon size={18} color="#94A3B8" />
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-[#1E293B]">{device.name}</Text>
                    <Text className="text-xs text-[#94A3B8]">{device.mac}</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => handlePair(device)}
                  className="px-1 py-1"
                  accessibilityRole="button"
                  accessibilityLabel={`Pair ${device.name}`}
                >
                  <Text className="text-sm font-bold text-[#3B82F6]">Pair</Text>
                </Pressable>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}
