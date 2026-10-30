import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BaseModal } from './BaseModal';
import { InfoIcon } from './LucideIcons';

type CustomAlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type CustomAlertOptions = {
  cancelable?: boolean;
  onDismiss?: () => void;
};

type CustomAlertRequest = {
  title: string;
  message?: string;
  buttons: CustomAlertButton[];
  options?: CustomAlertOptions;
};

type AlertDispatch = (request: CustomAlertRequest) => void;

let dispatchAlert: AlertDispatch | null = null;
const pendingAlerts: CustomAlertRequest[] = [];

export const CustomAlert = {
  alert(
    title: string,
    message?: string,
    buttons?: CustomAlertButton[],
    options?: CustomAlertOptions,
  ) {
    const request = {
      title,
      message,
      buttons: buttons?.length ? buttons : [{ text: 'OK' }],
      options,
    };
    if (dispatchAlert) {
      dispatchAlert(request);
    } else {
      pendingAlerts.push(request);
    }
  },
};

export function CustomAlertHost() {
  const [alerts, setAlerts] = useState<CustomAlertRequest[]>([]);
  const activeAlert = alerts[0];

  useEffect(() => {
    dispatchAlert = request => {
      setAlerts(current => [...current, request]);
    };
    pendingAlerts.splice(0).forEach(dispatchAlert);

    return () => {
      dispatchAlert = null;
    };
  }, []);

  const dismiss = () => {
    if (!activeAlert) {
      return;
    }
    setAlerts(current => current.slice(1));
    activeAlert.options?.onDismiss?.();
  };

  const handleButtonPress = (button: CustomAlertButton) => {
    setAlerts(current => current.slice(1));
    button.onPress?.();
  };

  return (
    <BaseModal
      closeOnBackdropPress={activeAlert?.options?.cancelable ?? false}
      icon={<InfoIcon size={22} color="#15803D" />}
      maxWidth={420}
      onClose={activeAlert?.options?.cancelable ? dismiss : () => {}}
      showCloseButton={false}
      title={activeAlert?.title}
      variant="center"
      visible={Boolean(activeAlert)}
    >
      {activeAlert?.message ? (
        <Text className="text-sm leading-6 text-[#475569]">
          {activeAlert.message}
        </Text>
      ) : null}
      <View
        className={`mt-5 gap-2 ${
          activeAlert && activeAlert.buttons.length <= 2
            ? 'flex-row justify-end'
            : ''
        }`}
      >
        {activeAlert?.buttons.map((button, index) => {
          const destructive = button.style === 'destructive';
          const cancel = button.style === 'cancel';
          return (
            <Pressable
              accessibilityLabel={button.text}
              accessibilityRole="button"
              key={`${button.text}-${index}`}
              onPress={() => handleButtonPress(button)}
              className={`min-h-11 items-center justify-center rounded-xl px-4 ${
                activeAlert.buttons.length <= 2 ? 'flex-1' : 'w-full'
              } ${
                cancel
                  ? 'border border-[#CBD5E1] bg-white'
                  : destructive
                  ? 'bg-[#DC2626]'
                  : 'bg-[#116C0B]'
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  cancel ? 'text-[#334155]' : 'text-white'
                }`}
              >
                {button.text}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BaseModal>
  );
}
