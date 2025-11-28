import { useEffect, useState, FormEvent } from "react";
import { useAuth } from "@/lib/authContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    postalCode: "",
    city: "",
    country: "",
    isActive: true,
  });
  const FALLBACK_CODES = [
    { code: "+1", label: "United States (+1)" },
    { code: "+44", label: "United Kingdom (+44)" },
    { code: "+61", label: "Australia (+61)" },
    { code: "+65", label: "Singapore (+65)" },
    { code: "+91", label: "India (+91)" },
    { code: "+94", label: "Sri Lanka (+94)" },
    { code: "+971", label: "United Arab Emirates (+971)" },
  ];
  const [countryCodes, setCountryCodes] = useState<
    { code: string; label: string }[]
  >([]);
  const [countryCode, setCountryCode] = useState<string>(
    FALLBACK_CODES[0].code
  );
  const [localPhone, setLocalPhone] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string>("");
  const [loadedPhone, setLoadedPhone] = useState<string>("");

  // Fetch country codes from API
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/country-codes");
        if (!res.ok) throw new Error("Failed to fetch country codes");
        const data = await res.json();
        console.log("Fetched country codes:", data);
        if (!Array.isArray(data))
          throw new Error("Invalid country codes payload");
        const mapped: { code: string; label: string }[] = [];
        const seen = new Set<string>();
        for (const it of data) {
          const name =
            (it?.name as string) ||
            (it?.country as string) ||
            (it?.Country as string) ||
            "";
          const rawDial = (it?.dial_code ??
            it?.dialCode ??
            it?.calling_code ??
            it?.callingCode ??
            it?.phone_code ??
            it?.phoneCode ??
            it?.code) as string | number | undefined;
          if (!rawDial) continue;
          let dial = String(rawDial).trim();
          if (!dial.startsWith("+")) dial = `+${dial.replace(/[^0-9]/g, "")}`;
          if (!/^\+[0-9]{1,4}$/.test(dial)) continue;
          const label = it.label;
          if (seen.has(dial)) continue;
          seen.add(dial);
          mapped.push({ code: dial, label });
        }
        mapped.sort((a, b) => a.label.localeCompare(b.label));
        if (!cancelled && mapped.length) setCountryCodes(mapped);
      } catch (e) {
        // fallback silently
        if (!cancelled) setCountryCodes(FALLBACK_CODES);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      try {
        const ref = doc(db, "profiles", user.uid);
        const snap = await getDoc(ref);
        const data = snap.exists() ? (snap.data() as any) : {};
        setForm({
          fullName: data.fullName || "",
          phone: data.phone || "",
          email: user.email || data.email || "",
          address: data.address || "",
          postalCode: data.postalCode || "",
          city: data.city || "",
          country: data.country || "",
          isActive: typeof data.isActive === "boolean" ? data.isActive : true,
        });

        // Prefill phone split into country code + local part
        const full = (data.phone as string) || "";
        setLoadedPhone(full);
        if (typeof full === "string" && full.startsWith("+")) {
          // Do initial split using fallback list for now; will refine once remote list loads
          const list = countryCodes.length ? countryCodes : FALLBACK_CODES;
          const found = list.find((c) => full.startsWith(c.code));
          if (found) {
            setCountryCode(found.code);
            setLocalPhone(full.slice(found.code.length));
          } else {
            setLocalPhone(full.replace(/^\+/, ""));
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    run();
  }, [user]);

  // When country codes finish loading, refine preselection if we had a loaded phone
  useEffect(() => {
    if (
      !loadedPhone ||
      !loadedPhone.startsWith("+") ||
      countryCodes.length === 0
    )
      return;
    const found = countryCodes.find((c) => loadedPhone.startsWith(c.code));
    if (found) {
      setCountryCode(found.code);
      setLocalPhone(loadedPhone.slice(found.code.length));
    }
  }, [loadedPhone, countryCodes]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    // Validate phone using selected country code + local part (digits only)
    const digits = (localPhone || "").replace(/\D/g, "");
    const fullPhone = `${countryCode}${digits}`;
    setPhoneError("");
    if (!digits) {
      setPhoneError("Enter your phone number");
      return;
    }
    // E.164 allows up to 15 digits in total (excluding '+'). We'll check combined length.
    const totalDigits = fullPhone.replace(/^\+/, "").length;
    if (totalDigits < 8 || totalDigits > 15) {
      setPhoneError("Enter a valid phone number");
      return;
    }
    setSaving(true);
    try {
      const ref = doc(db, "profiles", user.uid);
      await setDoc(
        ref,
        { ...form, phone: fullPhone, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      toast.success("Profile saved");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading…</div>;
  if (!user) return <div>Please login to edit your profile.</div>;

  return (
    <div className="max-w-xl mx-auto bg-white rounded-md p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Your Profile</h1>
        {form.isActive ? (
          <span className="inline-flex items-center gap-2 text-sm text-green-700">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
            Inactive
          </span>
        )}
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Full name"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
        <div>
          <label className="block text-sm text-ink/80 mb-1">Phone number</label>
          <div className="flex gap-2">
            <select
              className="border rounded px-2 py-2 bg-white min-w-[8rem]"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
            >
              {(countryCodes.length ? countryCodes : FALLBACK_CODES).map(
                (c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                )
              )}
              {countryCodes.length > 0 &&
                !countryCodes.find((c) => c.code === countryCode) && (
                  <option value={countryCode}>{countryCode}</option>
                )}
            </select>
            <input
              className={`border rounded px-3 py-2 flex-1 ${
                phoneError
                  ? "border-red-500 focus:border-red-500"
                  : "border-ink/20 focus:border-brand"
              }`}
              placeholder="Phone number"
              inputMode="numeric"
              value={localPhone}
              onChange={(e) => {
                setLocalPhone(e.target.value);
                if (phoneError) setPhoneError("");
              }}
            />
          </div>
          {phoneError && (
            <p className="mt-1 text-xs text-red-600">{phoneError}</p>
          )}
          <p className="mt-1 text-xs text-ink/60">
            Include only digits for the local number; country code is selected
            separately.
          </p>
        </div>
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="Postal code"
            value={form.postalCode}
            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Country"
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
        />
        <button
          disabled={saving}
          className="bg-brand text-white rounded px-4 py-2 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
