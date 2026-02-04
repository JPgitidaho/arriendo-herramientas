import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { api } from "../../lib/api";

export default function QuickAction() {
  const [identifier, setIdentifier] = useState("");
  const [user, setUser] = useState("");
  const [note, setNote] = useState("");

  async function doOut() {
    if (!identifier.trim()) return;
    try {
      await api.outUnit({ identifier: identifier.trim(), user, note });
      Alert.alert("OK", "OUT registrado");
    } catch (e: any) {
      if (e.status === 409 && e.data?.alternatives?.length) {
        const alts = e.data.alternatives.map((a: any) => a.identifier).slice(0, 6).join(", ");
        Alert.alert("No disponible", `Alternativas: ${alts}`);
        return;
      }
      Alert.alert("Error", e.message || "Error");
    }
  }

  async function doIn() {
    if (!identifier.trim()) return;
    try {
      await api.inUnit({ identifier: identifier.trim(), user, note });
      Alert.alert("OK", "IN registrado");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Error");
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Acción rápida</Text>

      <TextInput
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="Identifier (ej: HILTI-001)"
        style={{ borderWidth: 1, borderRadius: 10, padding: 10 }}
      />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={user}
          onChangeText={setUser}
          placeholder="User (opcional)"
          style={{ flex: 1, borderWidth: 1, borderRadius: 10, padding: 10 }}
        />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note (opcional)"
          style={{ flex: 1, borderWidth: 1, borderRadius: 10, padding: 10 }}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable onPress={doOut} style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1 }}>
          <Text style={{ textAlign: "center" }}>OUT</Text>
        </Pressable>

        <Pressable onPress={doIn} style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1 }}>
          <Text style={{ textAlign: "center" }}>IN</Text>
        </Pressable>
      </View>
    </View>
  );
}
