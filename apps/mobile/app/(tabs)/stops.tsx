/**
 * The stops list.
 *
 * The list of the stops of the run, with a filter for the status. The stop
 * detail opens in the sheet, which springs on the UI thread and can be
 * dragged away (`docs/design/SYSTEM.md` §5).
 *
 * Every row is a control with a label and a role, the status is never
 * colour-only, and there is no emoji anywhere.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Sheet } from '@/components/Sheet';
import { hapticFor } from '@/motion/haptics';

interface Stop {
  id: string;
  address: string;
  suburb: string;
  status: 'pending' | 'active' | 'delivered' | 'failed' | 'skipped';
  sequence: number;
  coordinates: { lat: number; lng: number };
  deliveredAt?: string;
  failedReason?: string;
}

const mockStops: Stop[] = [
  {
    id: '1',
    address: '2/14 Riccarton Road',
    suburb: 'Riccarton',
    status: 'delivered',
    sequence: 1,
    coordinates: { lat: -43.535, lng: 172.605 },
    deliveredAt: '08:32',
  },
  {
    id: '2',
    address: '45 Papanui Road',
    suburb: 'Merivale',
    status: 'active',
    sequence: 2,
    coordinates: { lat: -43.518, lng: 172.625 },
  },
  {
    id: '3',
    address: '120 Blenheim Road',
    suburb: 'Upper Riccarton',
    status: 'pending',
    sequence: 3,
    coordinates: { lat: -43.545, lng: 172.595 },
  },
  {
    id: '4',
    address: '78 Main South Road',
    suburb: 'Sockburn',
    status: 'pending',
    sequence: 4,
    coordinates: { lat: -43.565, lng: 172.575 },
  },
  {
    id: '5',
    address: '234 Colombo Street',
    suburb: 'Sydenham',
    status: 'pending',
    sequence: 5,
    coordinates: { lat: -43.548, lng: 172.638 },
  },
  {
    id: '6',
    address: '56 Ferry Road',
    suburb: 'Woolston',
    status: 'failed',
    sequence: 6,
    coordinates: { lat: -43.558, lng: 172.688 },
    failedReason: 'No safe access',
  },
  {
    id: '7',
    address: '89 Hills Road',
    suburb: 'Cashmere',
    status: 'skipped',
    sequence: 7,
    coordinates: { lat: -43.578, lng: 172.608 },
  },
];

const statusColorMap: Record<Stop['status'], string> = {
  delivered: 'statusDelivered',
  pending: 'statusPending',
  active: 'statusActive',
  failed: 'statusFailed',
  skipped: 'statusSkipped',
};

const statusLabels: Record<Stop['status'], string> = {
  delivered: 'Delivered',
  pending: 'Pending',
  active: 'Active',
  failed: 'Failed',
  skipped: 'Skipped',
};

const FILTERS = ['all', 'pending', 'active', 'delivered', 'failed', 'skipped'] as const;

type Filter = (typeof FILTERS)[number];

export default function StopsScreen() {
  const { theme } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);

  const filteredStops = filter === 'all' ? mockStops : mockStops.filter((s) => s.status === filter);

  const getStatusColor = (status: Stop['status']) => {
    return theme.colors[statusColorMap[status]] || theme.colors.textTertiary;
  };

  const getBadgeVariant = (status: Stop['status']) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'active':
        return 'active';
      case 'failed':
        return 'error';
      case 'skipped':
        return 'warning';
      default:
        return 'default';
    }
  };

  const renderItem = ({ item }: { item: Stop }) => (
    <TouchableOpacity
      style={styles.stopItem}
      testID={`stop-${item.id}`}
      onPress={() => setSelectedStop(item)}
      accessibilityRole="button"
      accessibilityLabel={`Stop ${item.sequence}, ${item.address}, ${item.suburb}, ${statusLabels[item.status]}`}
    >
      <View
        style={[styles.stopStatusDot, { backgroundColor: getStatusColor(item.status) }]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      />
      <View style={styles.stopNumberContainer}>
        <Text
          style={[
            styles.stopNumber,
            {
              color: theme.colors.textInverse,
              backgroundColor: getStatusColor(item.status),
            },
          ]}
        >
          #{item.sequence}
        </Text>
      </View>
      <View style={styles.stopInfo}>
        <Text style={[styles.stopAddress, { color: theme.colors.textPrimary }]}>
          {item.address}
        </Text>
        <Text style={[styles.stopSuburb, { color: theme.colors.textSecondary }]}>
          {item.suburb}
        </Text>
      </View>
      <View style={styles.stopRight}>
        <Badge variant={getBadgeVariant(item.status)}>{statusLabels[item.status]}</Badge>
        {item.deliveredAt ? (
          <Text style={[styles.deliveredTime, { color: theme.colors.textTertiary }]}>
            {item.deliveredAt}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      testID="stops-screen"
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>All Stops</Text>
        <Text style={[styles.count, { color: theme.colors.textSecondary }]}>
          {filteredStops.length} stops
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              filter === f && {
                backgroundColor: theme.colors.brandPrimary,
                borderColor: theme.colors.brandPrimary,
              },
              { borderColor: theme.colors.border },
            ]}
            onPress={() => setFilter(f)}
            accessibilityRole="tab"
            accessibilityLabel={`${f.charAt(0).toUpperCase()}${f.slice(1)} stops`}
            accessibilityState={{ selected: filter === f }}
            testID={`stops-filter-${f}`}
          >
            <Text
              style={[
                styles.filterTabText,
                {
                  color: filter === f ? theme.colors.textInverse : theme.colors.textSecondary,
                },
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredStops}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              size={48}
              color={theme.colors.textTertiary}
            />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No stops here yet
            </Text>
            <Text style={[styles.emptyHint, { color: theme.colors.textTertiary }]}>
              Change the filter to see the other stops.
            </Text>
          </View>
        }
      />

      {/* Stop Detail Sheet */}
      <Sheet
        isOpen={selectedStop !== null}
        onClose={() => setSelectedStop(null)}
        title={selectedStop ? `Stop ${selectedStop.sequence}` : undefined}
        subtitle={selectedStop ? statusLabels[selectedStop.status] : undefined}
        size="medium"
        testID="stop-detail-sheet"
      >
        {selectedStop ? (
          <>
            <View style={styles.modalBody}>
              <Text style={[styles.modalAddress, { color: theme.colors.textPrimary }]}>
                {selectedStop.address}
              </Text>
              <Text style={[styles.modalSuburb, { color: theme.colors.textSecondary }]}>
                {selectedStop.suburb}
              </Text>
              <View style={[styles.modalCoordinates, { borderTopColor: theme.colors.border }]}>
                <Text style={[styles.modalCoordLabel, { color: theme.colors.textTertiary }]}>
                  Coordinates
                </Text>
                <Text style={[styles.modalCoordValue, { color: theme.colors.textSecondary }]}>
                  {selectedStop.coordinates.lat.toFixed(6)},{' '}
                  {selectedStop.coordinates.lng.toFixed(6)}
                </Text>
              </View>
              {selectedStop.deliveredAt ? (
                <View style={[styles.modalCoordinates, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.modalCoordLabel, { color: theme.colors.textTertiary }]}>
                    Delivered at
                  </Text>
                  <Text style={[styles.modalCoordValue, { color: theme.colors.success }]}>
                    {selectedStop.deliveredAt}
                  </Text>
                </View>
              ) : null}
              {selectedStop.failedReason ? (
                <View style={[styles.modalCoordinates, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.modalCoordLabel, { color: theme.colors.textTertiary }]}>
                    Failed reason
                  </Text>
                  <Text style={[styles.modalCoordValue, { color: theme.colors.error }]}>
                    {selectedStop.failedReason}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.modalActions}>
              <Button
                variant={selectedStop.status === 'delivered' ? 'outline' : 'primary'}
                onPress={() => {
                  hapticFor('deliver');
                  console.log('Mark delivered', selectedStop.id);
                  setSelectedStop(null);
                }}
                disabled={selectedStop.status === 'delivered'}
                style={styles.modalActionButton}
                testID="stop-mark-delivered"
              >
                {selectedStop.status === 'delivered' ? 'Delivered' : 'Mark Delivered'}
              </Button>
              <Button
                variant="secondary"
                onPress={() => {
                  hapticFor('confirm');
                  console.log('Skip', selectedStop.id);
                  setSelectedStop(null);
                }}
                style={styles.modalActionButton}
                testID="stop-skip"
              >
                Skip
              </Button>
              <Button
                variant="outline"
                onPress={() => {
                  hapticFor('error');
                  console.log('Navigate', selectedStop.id);
                  setSelectedStop(null);
                }}
                style={styles.modalActionButton}
                testID="stop-navigate"
              >
                Navigate
              </Button>
            </View>
          </>
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28, fontWeight: '800' },
  count: { fontSize: 19, fontWeight: '500' },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  filterTab: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 28,
    borderWidth: 1,
  },
  filterTabText: { fontSize: 19, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 100, gap: 8 },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  stopStatusDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  stopNumberContainer: { flexShrink: 0 },
  stopNumber: {
    fontSize: 19,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 40,
    textAlign: 'center',
  },
  stopInfo: { flex: 1, minWidth: 0 },
  stopAddress: { fontSize: 20, fontWeight: '600' },
  stopSuburb: { fontSize: 19 },
  stopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deliveredTime: { fontSize: 17, fontWeight: '500' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: { fontSize: 20, fontWeight: '600' },
  emptyHint: { fontSize: 19 },
  modalBody: { paddingHorizontal: 8, marginBottom: 24 },
  modalAddress: { fontSize: 28, fontWeight: '600', marginBottom: 4 },
  modalSuburb: { fontSize: 20, marginBottom: 12 },
  modalCoordinates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  modalCoordLabel: { fontSize: 17, fontWeight: '500' },
  modalCoordValue: { fontSize: 17 },
  modalActions: { flexDirection: 'row', gap: 8 },
  modalActionButton: { flex: 1 },
});
