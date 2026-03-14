import { StyleSheet, Text, View } from 'react-native';
import { hp, wp } from '../helpers/common';

interface Step {
  label: string;
  number: number;
}

interface ProviderSetupProgressProps {
  currentStep: 1 | 2 | 3;
}

const STEPS: Step[] = [
  { label: 'الحساب', number: 1 },
  { label: 'الخطة', number: 2 },
  { label: 'النشاط', number: 3 },
];

export default function ProviderSetupProgress({ currentStep }: ProviderSetupProgressProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.stepIndicator}>
        {STEPS.map((step, index) => {
          const isDone = step.number < currentStep;
          const isActive = step.number === currentStep;
          return (
            <View key={step.number} style={styles.stepRow}>
              <View style={[
                styles.stepCircle,
                isDone && styles.stepDone,
                isActive && styles.stepActive,
                !isDone && !isActive && styles.stepInactive,
              ]}>
                {isDone ? (
                  <Text style={styles.stepDoneText}>✓</Text>
                ) : (
                  <Text style={[
                    styles.stepNumber,
                    isActive && styles.stepNumberActive,
                  ]}>
                    {step.number}
                  </Text>
                )}
              </View>
              {index < STEPS.length - 1 && (
                <View style={[
                  styles.stepLine,
                  isDone && styles.stepLineDone,
                ]} />
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.stepLabels}>
        {STEPS.map((step) => {
          const isDone = step.number < currentStep;
          const isActive = step.number === currentStep;
          return (
            <Text
              key={step.number}
              style={[
                styles.stepLabel,
                isDone && styles.stepLabelDone,
                isActive && styles.stepLabelActive,
                !isDone && !isActive && styles.stepLabelInactive,
              ]}
            >
              {step.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: hp(3),
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1),
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDone: {
    backgroundColor: '#10B981',
  },
  stepActive: {
    backgroundColor: '#2F6FDB',
  },
  stepInactive: {
    backgroundColor: '#E5E7EB',
  },
  stepDoneText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: wp(3.5),
  },
  stepNumber: {
    color: '#9CA3AF',
    fontWeight: '700',
    fontSize: wp(3.5),
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: wp(12),
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: wp(2),
  },
  stepLineDone: {
    backgroundColor: '#10B981',
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: wp(10),
  },
  stepLabel: {
    fontSize: wp(3),
    fontWeight: '500',
  },
  stepLabelDone: {
    color: '#10B981',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#2F6FDB',
    fontWeight: '700',
  },
  stepLabelInactive: {
    color: '#9CA3AF',
  },
});