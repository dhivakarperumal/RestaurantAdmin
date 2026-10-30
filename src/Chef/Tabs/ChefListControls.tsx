import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SearchIcon } from '../../Admin/Navigation/NavigationIcons';
import colors from '../../theme/colors';

export type ChefListFilter = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

export type ChefListSort = {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  open,
  onToggle,
}: ChefListFilter & {
  open: boolean;
  onToggle: () => void;
}) {
  const selectedLabel =
    options.find(option => option.value === value)?.label ??
    options[0]?.label ??
    '';

  return (
    <View
      className="min-w-0 flex-1"
      style={{
        position: 'relative',
        zIndex: open ? 40 : 0,
        elevation: open ? 40 : 0,
      }}
    >
      <Text className="mb-1 text-[10px] font-bold text-[#475569]">{label}</Text>
      <Pressable
        accessibilityLabel={`${label}: ${selectedLabel}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        className="min-h-10 flex-row items-center justify-between rounded-lg border border-[#CBD5E1] bg-white px-2.5"
      >
        <Text className="flex-1 text-xs text-[#334155]" numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Text className="ml-1 text-xs text-[#64748B]">{open ? '⌃' : '⌄'}</Text>
      </Pressable>
      {open ? (
        <View
          className="absolute left-0 right-0 top-[62px] overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-lg"
          style={{ zIndex: 50, elevation: 50 }}
        >
          {options.map(option => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: option.value === value }}
              key={option.value}
              onPress={() => {
                onChange(option.value);
                onToggle();
              }}
              className={`min-h-10 justify-center border-b border-[#F1F5F9] px-3 ${
                option.value === value ? 'bg-[#F0FDF4]' : ''
              }`}
            >
              <Text
                numberOfLines={1}
                className={`text-xs ${
                  option.value === value
                    ? 'font-bold text-[#116C0B]'
                    : 'text-[#334155]'
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ChefListControls({
  search,
  onSearchChange,
  searchLabel,
  placeholder,
  filters,
  sort,
  viewMode,
  onViewModeChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchLabel: string;
  placeholder: string;
  filters: ChefListFilter[];
  sort?: ChefListSort;
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
}) {
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const selectorCount = filters.length + (sort ? 1 : 0);
  const hasTwoSelectors = selectorCount === 2;

  const renderFilter = (filter: ChefListFilter) => (
    <FilterDropdown
      key={filter.label}
      {...filter}
      open={openFilter === filter.label}
      onToggle={() =>
        setOpenFilter(current =>
          current === filter.label ? null : filter.label,
        )
      }
    />
  );

  const renderSort = () =>
    sort ? (
      <FilterDropdown
        label="Sort by"
        value={sort.value}
        options={sort.options}
        onChange={sort.onChange}
        open={openFilter === 'sort'}
        onToggle={() =>
          setOpenFilter(current => (current === 'sort' ? null : 'sort'))
        }
      />
    ) : null;

  return (
    <View
      className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5"
      style={{
        position: 'relative',
        zIndex: openFilter ? 20 : 0,
        elevation: openFilter ? 20 : 0,
      }}
    >
      <View className="min-h-11 flex-row items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3">
        <SearchIcon color="#9CA3AF" size={17} />
        <TextInput
          accessibilityLabel={searchLabel}
          className="ml-2 flex-1 py-2 text-sm text-[#012711]"
          onChangeText={onSearchChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={search}
        />
      </View>
      {hasTwoSelectors ? (
        <View className="flex-row items-end gap-2">
          {filters.map(renderFilter)}
          {renderSort()}
          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
          />
        </View>
      ) : (
        <>
          {filters.length ? (
            <View className="flex-row flex-wrap gap-2">
              {filters.map(renderFilter)}
            </View>
          ) : null}
          <View className="flex-row items-end gap-2">
            {renderSort() ?? <View className="flex-1" />}
            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
            />
          </View>
        </>
      )}
    </View>
  );
}

function ViewModeToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
}) {
  return (
    <View className="h-10 flex-row items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
      {(['grid', 'table'] as const).map(mode => {
        const selected = viewMode === mode;
        return (
          <Pressable
            accessibilityLabel={`Show results as ${mode}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={mode}
            onPress={() => onViewModeChange(mode)}
            className={`h-9 w-9 items-center justify-center rounded-md ${
              selected ? 'bg-[#116C0B]' : 'bg-[#F3F4F6]'
            }`}
          >
            <Text
              className={`text-base font-bold ${
                selected ? 'text-white' : 'text-[#64748B]'
              }`}
            >
              {mode === 'grid' ? '▦' : '☷'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default ChefListControls;
