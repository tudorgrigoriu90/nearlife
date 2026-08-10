import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { dualSegments, type DualTextInput } from '../lib/dualLanguageFormat';
import { textAlignFor, writingDirectionFor } from '../lib/i18n/bidi';

// Dual-language body text (T-150 · TASK-PLAN F13.3). Renders the primary paragraph followed by the
// mother-tongue paragraph, each as its own `Text` so the secondary can carry its own writing
// direction — the reason `dualSegments` returns segments rather than a joined string (T-149).
//
// Direction is applied per segment from that segment's locale, so an Arabic/Persian/Pashto/Sorani
// half reads right-to-left inside an otherwise left-to-right card without mirroring the layout.
// With no secondary this renders exactly one `Text`, identical to the single-language card — dual
// and single-language content go through the same path rather than a branch at every call site.

export default function DualText({
  input,
  style,
  secondaryStyle,
}: {
  input: DualTextInput;
  style?: StyleProp<TextStyle>;
  /** Extra styling for the mother-tongue paragraph (it is visually secondary to the primary). */
  secondaryStyle?: StyleProp<TextStyle>;
}) {
  return (
    <>
      {dualSegments(input).map((segment) => (
        <Text
          key={segment.isSecondary ? 'secondary' : 'primary'}
          style={[
            style,
            segment.isSecondary && styles.secondary,
            segment.isSecondary && secondaryStyle,
            {
              writingDirection: writingDirectionFor(segment.locale),
              textAlign: textAlignFor(segment.locale),
            },
          ]}
        >
          {segment.text}
        </Text>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  // The mother tongue is an aid alongside the primary, not a replacement — set apart with a rule
  // and muted colour so the two are never confused for one continuous paragraph.
  secondary: {
    marginTop: 6,
    paddingTop: 6,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#cfe0cd',
    color: '#5a6b5c',
  },
});
