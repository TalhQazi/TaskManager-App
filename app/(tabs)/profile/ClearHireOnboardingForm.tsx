import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  ShieldCheck,
  AlertTriangle,
  Plus,
  Trash2,
  Upload,
  FileImage,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { s, wp, hp, fs } from "@/util/styles";

interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  startDate: string;
  endDate: string;
}

interface ClearHireStatus {
  status: "PENDING" | "GREEN" | "YELLOW" | "RED";
  lastChecked: string;
}

interface ClearHireOnboardingFormProps {
  onStatusChange?: () => void;
}

interface SelectedFile {
  uri: string;
  name: string;
  base64?: string;
}

export default function ClearHireOnboardingForm({ onStatusChange }: ClearHireOnboardingFormProps) {
  const [status, setStatus] = useState<ClearHireStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Form State
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [ssn, setSsn] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([
    { street: "", city: "", state: "", zip: "", startDate: "", endDate: "" },
  ]);
  const [fcraConsent, setFcraConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // File States (using custom SelectedFile interface instead of web File objects)
  const [govIdFile, setGovIdFile] = useState<SelectedFile | null>(null);
  const [selfieFile, setSelfieFile] = useState<SelectedFile | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const res = await apiFetch<{ item: ClearHireStatus }>("/api/clearhire/status/me");
      setStatus(res.item);
    } catch (e) {
      setStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleAddAddress = useCallback(() => {
    setAddresses((prev) => [
      ...prev,
      { street: "", city: "", state: "", zip: "", startDate: "", endDate: "" },
    ]);
  }, []);

  const handleRemoveAddress = useCallback((index: number) => {
    setAddresses((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddressChange = useCallback((index: number, field: keyof Address, value: string) => {
    setAddresses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const formatSSN = useCallback((val: string) => {
    const cleaned = val.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{0,3})(\d{0,2})(\d{0,4})$/);
    if (!match) return val;
    return !match[2]
      ? match[1]
      : `${match[1]}-${match[2]}${match[3] ? `-${match[3]}` : ""}`;
  }, []);

  const pickImageMobile = async (type: "govId" | "selfie") => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Denied", "You need to allow camera/gallery access to upload images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const selectedAsset = result.assets[0];
      const filename = selectedAsset.uri.split("/").pop() || "upload.jpg";
      const fileData: SelectedFile = {
        uri: selectedAsset.uri,
        name: filename,
      };

      if (type === "govId") {
        setGovIdFile(fileData);
      } else {
        setSelfieFile(fileData);
      }
    }
  };

  const handleSubmit = async () => {
    if (!fullName || !dob || ssn.replace(/\D/g, "").length !== 9) {
      Alert.alert("Validation Error", "Please fill in your name, DOB, and 9-digit SSN.");
      return;
    }
    if (!fcraConsent) {
      Alert.alert("Consent Required", "You must agree to the FCRA background check consent.");
      return;
    }

    const hasEmptyAddress = addresses.some(
      (a) => !a.street || !a.city || !a.state || !a.zip || !a.startDate
    );
    if (hasEmptyAddress) {
      Alert.alert("Validation Error", "Please fill in all required address fields.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        userId: "me",
        fullName,
        dob,
        ssn,
        addressHistory: addresses.map((a) => ({
          ...a,
          endDate: a.endDate ? a.endDate : null,
        })),
        fcraConsentGiven: fcraConsent,
        governmentIdUrl: govIdFile ? "uploaded_url_placeholder" : "",
        selfieUrl: selfieFile ? "uploaded_url_placeholder" : "",
      };

      await apiFetch("/api/clearhire/submit", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      Alert.alert("Success", "Background check submitted successfully.");
      await fetchStatus();
      if (onStatusChange) onStatusChange();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit background check.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStatus) {
    return (
      <View style={s([styles.card, styles.center])}>
        <ActivityIndicator size="small" color="#64748b" />
      </View>
    );
  }

  // --- Render Status Block if Already Submitted ---
  if (status) {
    const isGreen = status.status === "GREEN";
    const isYellow = status.status === "YELLOW";
    const isRed = status.status === "RED";
    const isPending = status.status === "PENDING";

    let statusStyle = styles.statusGray;
    let badgeStyle = styles.badgeGray;
    let badgeTextStyle = styles.badgeTextGray;

    if (isGreen) {
      statusStyle = styles.statusGreen;
      badgeStyle = styles.badgeGreen;
      badgeTextStyle = styles.badgeTextGreen;
    } else if (isRed) {
      statusStyle = styles.statusRed;
      badgeStyle = styles.badgeRed;
      badgeTextStyle = styles.badgeTextRed;
    } else if (isYellow) {
      statusStyle = styles.statusYellow;
      badgeStyle = styles.badgeYellow;
      badgeTextStyle = styles.badgeTextYellow;
    }

    return (
      <View style={s(styles.card)}>
        <View style={s(styles.cardHeader)}>
          <View style={s([styles.stepCircle, isGreen ? styles.bgGreen : isRed ? styles.bgRed : isYellow ? styles.bgYellow : styles.bgGray])}>
            <Text style={s([styles.stepCircleText, isGreen ? styles.textGreen : isRed ? styles.textRed : isYellow ? styles.textYellow : styles.textGray])}>2</Text>
          </View>
          <View>
            <Text style={s(styles.cardTitle)}>Background Check (ClearHire®)</Text>
            <Text style={s(styles.cardDescription)}>Your pre-employment screening status</Text>
          </View>
        </View>

        <View style={s([styles.statusWrapper, statusStyle])}>
          {isGreen && <CheckCircle2 size={fs(8)} color="#16a34a" />}
          {isRed && <AlertTriangle size={fs(8)} color="#dc2626" />}
          {isYellow && <ShieldAlert size={fs(8)} color="#ca8a04" />}
          {isPending && <ActivityIndicator size="large" color="#6b7280" />}

          <View style={s({ flex: 1, marginLeft: wp(3) })}>
            <Text style={s(styles.statusHeading)}>
              {isGreen && "Cleared for Onboarding"}
              {isRed && "Background Check Failed"}
              {isYellow && "Under Administrative Review"}
              {isPending && "Background Check in Progress"}
            </Text>
            <Text style={s(styles.statusSubtext)}>
              Last checked: {status.lastChecked ? new Date(status.lastChecked).toLocaleDateString() : "N/A"}
            </Text>
          </View>

          <View style={s([styles.badge, badgeStyle])}>
            <Text style={s([styles.badgeText, badgeTextStyle])}>{status.status}</Text>
          </View>
        </View>
      </View>
    );
  }

  // --- Render Intake Submission Form ---
  return (
    <ScrollView style={s(styles.formContainer)} keyboardShouldPersistTaps="handled">
      <View style={s(styles.card)}>
        <View style={s(styles.cardHeader)}>
          <View style={s([styles.stepCircle, { backgroundColor: "#dbeafe" }])}>
            <Text style={s([styles.stepCircleText, { color: "#1d4ed8" }])}>2</Text>
          </View>
          <View style={s({ flex: 1 })}>
            <Text style={s(styles.cardTitle)}>Background Check (ClearHire®)</Text>
            <Text style={s(styles.cardDescription)}>
              We use ClearHire® to securely perform a pre-employment background check. Your information is encrypted using AES-256 and will not be shared.
            </Text>
          </View>
        </View>

        <View style={s(styles.formSection)}>
          <View style={s(styles.inputGroup)}>
            <Text style={s(styles.label)}>Full Legal Name</Text>
            <TextInput
              style={s(styles.input)}
              placeholder="As it appears on your ID"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View style={s(styles.inputGroup)}>
            <Text style={s(styles.label)}>Date of Birth</Text>
            <TextInput
              style={s(styles.input)}
              placeholder="YYYY-MM-DD"
              value={dob}
              onChangeText={setDob}
            />
          </View>

          <View style={s(styles.inputGroup)}>
            <View style={s({ flexDirection: "row", alignItems: "center", marginBottom: hp(0.5) })}>
              <ShieldCheck size={fs(4)} color="#059669" style={s({ marginRight: wp(1.5) })} />
              <Text style={s(styles.label)}>Social Security Number</Text>
            </View>
            <TextInput
              style={s(styles.input)}
              placeholder="XXX-XX-XXXX"
              value={ssn}
              onChangeText={(text) => setSsn(formatSSN(text))}
              maxLength={11}
              keyboardType="numeric"
            />
            <Text style={s(styles.helpText)}>
              Your SSN is securely encrypted and never stored in plain text.
            </Text>
          </View>

          {/* Address History Section */}
          <View style={s(styles.sectionHeaderRow)}>
            <Text style={s(styles.sectionHeadingTitle)}>Address History (7 Years)</Text>
            <TouchableOpacity style={s(styles.outlineMiniButton)} onPress={handleAddAddress}>
              <Plus size={fs(3.5)} color="#133767" style={s({ marginRight: wp(1) })} />
              <Text style={s(styles.outlineMiniButtonText)}>Add Address</Text>
            </TouchableOpacity>
          </View>

          {addresses.map((address, index) => (
            <View key={index} style={s(styles.addressBlock)}>
              {addresses.length > 1 && (
                <TouchableOpacity
                  style={s(styles.removeAddressButton)}
                  onPress={() => handleRemoveAddress(index)}
                >
                  <Trash2 size={fs(4)} color="#dc2626" />
                </TouchableOpacity>
              )}

              <View style={s(styles.inputGroup)}>
                <Text style={s(styles.label)}>Street Address</Text>
                <TextInput
                  style={s(styles.input)}
                  placeholder="123 Main St"
                  value={address.street}
                  onChangeText={(val) => handleAddressChange(index, "street", val)}
                />
              </View>

              <View style={s(styles.inputGroup)}>
                <Text style={s(styles.label)}>City</Text>
                <TextInput
                  style={s(styles.input)}
                  placeholder="City"
                  value={address.city}
                  onChangeText={(val) => handleAddressChange(index, "city", val)}
                />
              </View>

              <View style={s(styles.rowGrid)}>
                <View style={s({ flex: 1, marginRight: wp(2) })}>
                  <Text style={s(styles.label)}>State</Text>
                  <TextInput
                    style={s(styles.input)}
                    placeholder="CA"
                    maxLength={2}
                    autoCapitalize="characters"
                    value={address.state}
                    onChangeText={(val) => handleAddressChange(index, "state", val)}
                  />
                </View>
                <View style={s({ flex: 1.5 })}>
                  <Text style={s(styles.label)}>ZIP Code</Text>
                  <TextInput
                    style={s(styles.input)}
                    placeholder="12345"
                    keyboardType="numeric"
                    value={address.zip}
                    onChangeText={(val) => handleAddressChange(index, "zip", val)}
                  />
                </View>
              </View>

              <View style={s(styles.rowGrid)}>
                <View style={s({ flex: 1, marginRight: wp(2) })}>
                  <Text style={s(styles.label)}>Start Date</Text>
                  <TextInput
                    style={s(styles.input)}
                    placeholder="YYYY-MM-DD"
                    value={address.startDate}
                    onChangeText={(val) => handleAddressChange(index, "startDate", val)}
                  />
                </View>
                <View style={s({ flex: 1 })}>
                  <Text style={s(styles.label)}>End Date (Optional)</Text>
                  <TextInput
                    style={s(styles.input)}
                    placeholder="Present"
                    value={address.endDate}
                    onChangeText={(val) => handleAddressChange(index, "endDate", val)}
                  />
                </View>
              </View>
            </View>
          ))}

          {/* Verification Document Uploads */}
          <View style={s(styles.rowGrid)}>
            <View style={s([styles.uploadBox, { marginRight: wp(2) }])}>
              <Text style={s(styles.uploadBoxLabel)}>Government ID</Text>
              <TouchableOpacity style={s(styles.uploadButton)} onPress={() => pickImageMobile("govId")}>
                <Upload size={fs(3.5)} color="#133767" style={s({ marginRight: wp(1.5) })} />
                <Text style={s(styles.uploadButtonText)} numberOfLines={1}>
                  {govIdFile ? govIdFile.name : "Upload Doc"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={s(styles.uploadBox)}>
              <Text style={s(styles.uploadBoxLabel)}>Selfie Verification</Text>
              <TouchableOpacity style={s(styles.uploadButton)} onPress={() => pickImageMobile("selfie")}>
                <FileImage size={fs(3.5)} color="#133767" style={s({ marginRight: wp(1.5) })} />
                <Text style={s(styles.uploadButtonText)} numberOfLines={1}>
                  {selfieFile ? selfieFile.name : "Upload Selfie"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Consent Checkbox */}
          <TouchableOpacity
            style={s(styles.consentContainer)}
            activeOpacity={0.8}
            onPress={() => setFcraConsent(!fcraConsent)}
          >
            <View style={s([styles.checkboxContainer, fcraConsent && styles.checkboxChecked])}>
              {fcraConsent && <CheckCircle2 size={fs(3.5)} color="#fff" />}
            </View>
            <View style={s({ flex: 1, marginLeft: wp(2.5) })}>
              <Text style={s(styles.consentTitle)}>FCRA Background Check Consent</Text>
              <Text style={s(styles.consentBody)}>
                I hereby authorize Task Manager and ClearHire® to obtain "consumer reports" and
                "investigative consumer reports" about me at any time after receipt of this
                authorization and throughout my employment, if applicable.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Submit Action Button */}
          <TouchableOpacity
            style={s(styles.submitButton)}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" style={s({ marginRight: wp(2) })} />
            ) : (
              <ShieldCheck size={fs(4)} color="#fff" style={s({ marginRight: wp(2) })} />
            )}
            <Text style={s(styles.submitButtonText)}>
              {submitting ? "Submitting Securely..." : "Submit Background Check"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: wp(3),
    padding: wp(4),
    margin: wp(3),
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    padding: wp(8),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: hp(2),
  },
  stepCircle: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(3),
    marginTop: hp(0.25),
  },
  stepCircleText: {
    fontSize: fs(3.5),
    fontWeight: "bold",
  },
  cardTitle: {
    fontSize: fs(4),
    fontWeight: "700",
    color: "#1e293b",
  },
  cardDescription: {
    fontSize: fs(3.2),
    color: "#64748b",
    marginTop: hp(0.5),
    lineHeight: fs(4.5),
  },
  formSection: {
    gap: hp(1.8),
  },
  inputGroup: {
    marginBottom: hp(1.5),
  },
  label: {
    fontSize: fs(3.2),
    fontWeight: "600",
    color: "#475569",
    marginBottom: hp(0.5),
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: wp(1.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    fontSize: fs(3.5),
    color: "#334155",
  },
  helpText: {
    fontSize: fs(2.8),
    color: "#64748b",
    marginTop: hp(0.5),
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: hp(1.5),
    marginBottom: hp(0.5),
  },
  sectionHeadingTitle: {
    fontSize: fs(3.5),
    fontWeight: "700",
    color: "#1e293b",
  },
  outlineMiniButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2),
    borderRadius: wp(1),
  },
  outlineMiniButtonText: {
    fontSize: fs(3),
    color: "#133767",
    fontWeight: "600",
  },
  addressBlock: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: wp(2),
    padding: wp(3),
    position: "relative",
    marginBottom: hp(1),
  },
  removeAddressButton: {
    position: "absolute",
    top: wp(2.5),
    right: wp(2.5),
    zIndex: 10,
  },
  rowGrid: {
    flexDirection: "row",
    marginBottom: hp(0.5),
  },
  uploadBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: wp(2),
    padding: wp(3),
  },
  uploadBoxLabel: {
    fontSize: fs(3),
    fontWeight: "600",
    color: "#475569",
    marginBottom: hp(0.75),
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    borderRadius: wp(1.5),
    paddingVertical: hp(1),
    paddingHorizontal: wp(2.5),
  },
  uploadButtonText: {
    fontSize: fs(3),
    color: "#133767",
    fontWeight: "600",
  },
  consentContainer: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: wp(2),
    padding: wp(3),
    marginTop: hp(1),
  },
  checkboxContainer: {
    width: wp(4.5),
    height: wp(4.5),
    borderRadius: wp(1),
    borderWidth: 1.5,
    borderColor: "#2563eb",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: hp(0.25),
  },
  checkboxChecked: {
    backgroundColor: "#2563eb",
  },
  consentTitle: {
    fontSize: fs(3.2),
    fontWeight: "700",
    color: "#1e3a8a",
  },
  consentBody: {
    fontSize: fs(2.8),
    color: "#1e40af",
    lineHeight: fs(4),
    marginTop: hp(0.25),
  },
  submitButton: {
    backgroundColor: "#133767",
    borderRadius: wp(1.5),
    paddingVertical: hp(1.5),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: hp(1),
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: fs(3.5),
    fontWeight: "600",
  },
  // --- Native Screen Status State Visual Styles ---
  statusWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: wp(2),
    padding: wp(3),
  },
  statusHeading: {
    fontSize: fs(3.8),
    fontWeight: "700",
    color: "#0f172a",
  },
  statusSubtext: {
    fontSize: fs(3),
    color: "#64748b",
    marginTop: hp(0.25),
  },
  badge: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderRadius: wp(1),
    borderWidth: 1,
  },
  badgeText: {
    fontSize: fs(2.8),
    fontWeight: "700",
  },
  bgGreen: { backgroundColor: "#dcfce7" },
  textGreen: { color: "#15803d" },
  statusGreen: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  badgeGreen: { backgroundColor: "#dcfce7", borderColor: "#bbf7d0" },
  badgeTextGreen: { color: "#16a34a" },
  bgRed: { backgroundColor: "#fee2e2" },
  textRed: { color: "#b91c1c" },
  statusRed: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  badgeRed: { backgroundColor: "#fee2e2", borderColor: "#fecaca" },
  badgeTextRed: { color: "#dc2626" },
  bgYellow: { backgroundColor: "#fef9c3" },
  textYellow: { color: "#a16207" },
  statusYellow: { backgroundColor: "#fefce8", borderColor: "#fef08a" },
  badgeYellow: { backgroundColor: "#fef9c3", borderColor: "#fef08a" },
  badgeTextYellow: { color: "#ca8a04" },
  bgGray: { backgroundColor: "#f3f4f6" },
  textGray: { color: "#374151" },
  statusGray: { backgroundColor: "#f9fafb", borderColor: "#e5e7eb" },
  badgeGray: { backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" },
  badgeTextGray: { color: "#4b5563" },
});