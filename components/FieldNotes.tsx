import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createTranslator, type Locale } from '../lib/i18n';
import { NOTE_MAX_CHARS, type FieldNote } from '../lib/fieldNotes';

// "Your notes" on a spotted species' card (T-347 · review F-07). On the phone only.

const today = () => new Date().toISOString().slice(0, 10);

export default function FieldNotes({
  locale,
  notes,
  onAdd,
}: {
  locale: Locale;
  /** This species' notes, newest first. */
  notes: FieldNote[];
  /** False when the note could not be kept (empty, or not a date). */
  onAdd: (date: string, text: string) => boolean;
}) {
  const tr = createTranslator(locale);
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(today);
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);

  const save = () => {
    if (onAdd(date.trim(), text)) {
      setEditing(false);
      setText('');
      setDate(today());
      setInvalid(false);
    } else {
      setInvalid(true);
    }
  };

  return (
    <View style={styles.box} testID="field-notes">
      {notes.length > 0 ? <Text style={styles.title}>{tr('notes.title')}</Text> : null}
      {notes.map((n) => (
        <View key={n.id} style={styles.note}>
          <Text style={styles.date}>{n.date}</Text>
          <Text style={styles.text}>{n.text}</Text>
        </View>
      ))}
      {editing ? (
        <View style={styles.editor}>
          <TextInput
            value={date}
            onChangeText={setDate}
            accessibilityLabel={tr('notes.date')}
            placeholder="YYYY-MM-DD"
            style={styles.input}
          />
          <TextInput
            value={text}
            onChangeText={setText}
            accessibilityLabel={tr('notes.placeholder')}
            placeholder={tr('notes.placeholder')}
            multiline
            maxLength={NOTE_MAX_CHARS}
            style={[styles.input, styles.multiline]}
          />
          {invalid ? <Text style={styles.invalid}>{tr('notes.invalid')}</Text> : null}
          <Text style={styles.privacy}>{tr('notes.privacy')}</Text>
          <View style={styles.actions}>
            <Pressable onPress={save} accessibilityRole="button" style={styles.saveBtn}>
              <Text style={styles.saveText}>{tr('notes.save')}</Text>
            </Pressable>
            <Pressable onPress={() => setEditing(false)} accessibilityRole="button" style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{tr('report.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setEditing(true)} accessibilityRole="button" style={styles.addBtn}>
          <Text style={styles.addText}>✎ {tr('notes.add')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 16, gap: 6 },
  title: { fontSize: 16, fontWeight: '700', color: '#22331f' },
  note: { backgroundColor: '#f4f8f2', borderRadius: 10, padding: 10 },
  date: { fontSize: 12, fontWeight: '600', color: '#566658' },
  text: { fontSize: 15, lineHeight: 21, color: '#22331f', marginTop: 2 },
  editor: { gap: 8 },
  input: { borderWidth: 1, borderColor: '#cdd8ca', borderRadius: 10, padding: 10, fontSize: 15, color: '#22331f' },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  invalid: { fontSize: 13, color: '#b3261e' },
  privacy: { fontSize: 12, color: '#566658' },
  actions: { flexDirection: 'row', gap: 8 },
  saveBtn: { backgroundColor: '#3a7d44', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8 },
  saveText: { color: '#fff', fontWeight: '700' },
  cancelBtn: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#cdd8ca' },
  cancelText: { color: '#336f3c', fontWeight: '600' },
  addBtn: { alignSelf: 'flex-start', paddingVertical: 6 },
  addText: { fontSize: 15, fontWeight: '600', color: '#336f3c' },
});
