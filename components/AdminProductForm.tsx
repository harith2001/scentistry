import { FormEvent, useEffect, useState } from "react";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebaseClient";
import toast from "react-hot-toast";
import { Product } from "@/types";

interface Props {
  existing?: Product | null;
  onDone?: () => void;
}

export default function AdminProductForm({ existing, onDone }: Props) {
  const [title, setTitle] = useState(existing?.title || "");
  const [price, setPrice] = useState(existing?.price?.toString() || "");
  const [discountedPrice, setDiscountedPrice] = useState(
    existing?.discountedPrice != null ? existing.discountedPrice.toString() : ""
  );
  const [stock, setStock] = useState(existing?.stock?.toString() || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [ingredients, setIngredients] = useState(existing?.ingredients || "");
  const [imagesInput, setImagesInput] = useState(
    existing?.images?.join(",") || ""
  );
  const [uploaded, setUploaded] = useState<string[]>(existing?.images || []);
  const [uploading, setUploading] = useState(false);
  const [scents, setScents] = useState(existing?.scents?.join(",") || "");
  const [moods, setMoods] = useState(existing?.moods?.join(",") || "");
  const [limitedEdition, setLimitedEdition] = useState(
    !!existing?.limitedEdition
  );
  const [size, setSize] = useState(existing?.size || existing?.sku || "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const priceNum = parseFloat(price) || 0;
      const discountedNum = discountedPrice === "" ? undefined : Math.max(0, parseFloat(discountedPrice) || 0);
      if (discountedNum !== undefined && discountedNum >= priceNum) {
        toast.error("Discounted price must be less than original price");
        setSaving(false);
        return;
      }
      const data = {
        title: title.trim(),
        price: priceNum,
        stock: parseInt(stock || "0", 10),
        description: description.trim(),
        ingredients: ingredients.trim(),
        images: uploaded.length
          ? uploaded
          : imagesInput
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
        scents: scents
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        moods: moods
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        limitedEdition,
        size: size.trim(),
        // keep writing legacy sku for now for older data compatibility
        sku: size.trim(),
        updatedAt: new Date().toISOString(),
        ...(discountedNum !== undefined ? { discountedPrice: discountedNum } : {}),
      };
      if (existing) {
        await updateDoc(doc(db, "products", existing.id), data as any);
        toast.success("Product updated");
      } else {
        await addDoc(collection(db, "products"), {
          ...data,
          createdAt: new Date().toISOString(),
        } as any);
        toast.success("Product created");
      }
      onDone?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const canAddMore = uploaded.length < 3;

  async function handleSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!canAddMore) {
      toast.error("Maximum 3 images");
      return;
    }
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
      toast.error("Only JPG, PNG, WEBP allowed");
      return;
    }
    setUploading(true);
    try {
      const token = await auth.currentUser?.getIdToken?.();
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/products/upload-image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setUploaded((prev) => [...prev, data.url || data.path]);
      toast.success("Image uploaded");
      e.target.value = "";
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(path: string) {
    setUploaded((prev) => prev.filter((p) => p !== path));
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        className="border rounded px-3 py-2 w-full"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="border rounded px-3 py-2 w-full"
        placeholder="Price"
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <input
        className="border rounded px-3 py-2 w-full"
        placeholder="Discounted price (optional)"
        type="number"
        value={discountedPrice}
        onChange={(e) => setDiscountedPrice(e.target.value)}
      />
      <input
        className="border rounded px-3 py-2 w-full"
        placeholder="Stock"
        type="number"
        value={stock}
        onChange={(e) => setStock(e.target.value)}
      />
      <textarea
        className="border rounded px-3 py-2 w-full"
        placeholder="Description"
        rows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <textarea
        className="border rounded px-3 py-2 w-full"
        placeholder="Ingredients"
        rows={2}
        value={ingredients}
        onChange={(e) => setIngredients(e.target.value)}
      />
      {/* Local upload section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Images (max 3)</span>
          {canAddMore && (
            <label className="cursor-pointer text-sm text-brand hover:underline">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSelectFile}
                disabled={uploading}
              />
              {uploading ? "Uploading…" : "Add image"}
            </label>
          )}
        </div>
        {uploaded.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {uploaded.map((path) => (
              <div
                key={path}
                className="relative group border rounded overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={path}
                  alt="Product"
                  className="w-full h-24 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(path)}
                  className="absolute top-1 right-1 bg-white/80 hover:bg-white text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {uploaded.length === 0 && (
          <p className="text-xs text-gray-500">No images uploaded yet.</p>
        )}
        {/* Fallback manual list (comma URLs) */}
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Or paste external image URLs, comma separated"
          value={imagesInput}
          onChange={(e) => setImagesInput(e.target.value)}
        />
      </div>
      <input
        className="border rounded px-3 py-2 w-full"
        placeholder="Scents (comma)"
        value={scents}
        onChange={(e) => setScents(e.target.value)}
      />
      <input
        className="border rounded px-3 py-2 w-full"
        placeholder="Moods (comma)"
        value={moods}
        onChange={(e) => setMoods(e.target.value)}
      />
      <input
        className="border rounded px-3 py-2 w-full"
        placeholder="Size (e.g. Large - 2 x 4 cm)"
        value={size}
        onChange={(e) => setSize(e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={limitedEdition}
          onChange={(e) => setLimitedEdition(e.target.checked)}
        />{" "}
        Limited edition
      </label>
      <div className="flex items-center gap-2">
        <button
          disabled={saving}
          className="bg-brand text-white rounded px-4 py-2 disabled:opacity-60"
        >
          {saving ? "Saving…" : existing ? "Update" : "Create"}
        </button>
        {existing && (
          <button
            type="button"
            onClick={onDone}
            className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
