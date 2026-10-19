
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ImagePlus,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

export default function ScanMedicine() {
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  function handleImage(file) {
    setError("");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("The image must be smaller than 10 MB.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setImage((previous) => {
      if (previous?.previewUrl) {
        URL.revokeObjectURL(previous.previewUrl);
      }

      return {
        file,
        previewUrl,
        name: file.name,
      };
    });
  }

  function removeImage() {
    if (image?.previewUrl) {
      URL.revokeObjectURL(image.previewUrl);
    }

    setImage(null);
    setError("");

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function handleContinue() {
    if (!image) {
      setError("Upload or capture a medicine-pack image first.");
      return;
    }

    // OCR and registry verification will be connected here.
    setError(
      "Image selected successfully. Verification will be available after the API is connected."
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#4926C8]"
      >
        <ArrowLeft size={17} />
        Back to dashboard
      </Link>

      <header className="mb-8 mt-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-[#4926C8]">
          <ScanLine size={25} />
        </div>

        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[#242039]">
          Scan Medicine
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          Upload or capture a clear photograph of the medicine packaging.
          We'll use its printed details to check for a matching registry record.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        {/* Image upload area */}
        <section className="rounded-3xl border border-[#E9E5F1] bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[#242039]">
              Medicine package image
            </h2>

            {image && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 size={15} />
                Image selected
              </span>
            )}
          </div>

          {!image ? (
            <div className="mt-5 flex min-h-[280px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 px-5 py-9 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-[#4926C8]">
                <ImagePlus size={30} />
              </div>

              <h3 className="mt-5 text-base font-bold text-[#242039]">
                Add a medicine photo
              </h3>

              <p className="mt-2 max-w-xs text-xs leading-5 text-gray-500">
                Choose a photo from your device or use your phone camera.
                JPG, PNG and other browser-supported image formats are accepted.
              </p>

              <div className="mt-6 flex w-full max-w-sm flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#4926C8] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#381BA8]"
                >
                  <Upload size={17} />
                  Upload image
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm font-bold text-[#4926C8] transition hover:bg-purple-50"
                >
                  <Camera size={17} />
                  Take photo
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                <img
                  src={image.previewUrl}
                  alt="Selected medicine packaging"
                  className="max-h-[420px] w-full object-contain"
                />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#242039]">
                    {image.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {(image.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={removeImage}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <X size={15} />
                  Remove
                </button>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#4926C8] hover:underline"
              >
                <RotateCcw size={16} />
                Choose another image
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleImage(event.target.files?.[0])}
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => handleImage(event.target.files?.[0])}
          />

          {error && (
            <div
              role="status"
              className={`mt-4 rounded-xl p-3 text-xs leading-5 ${
                error.startsWith("Image selected")
                  ? "bg-amber-50 text-amber-800"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleContinue}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4926C8] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#381BA8]"
          >
            Continue to verification
            <ArrowRight size={17} />
          </button>

          <p className="mt-3 text-center text-[10px] leading-5 text-gray-400">
            Selecting an image does not verify the medicine. Verification
            requires the OCR and registry services.
          </p>
        </section>

        {/* Photographing guidance */}
        <aside className="space-y-5">
          <section className="rounded-3xl border border-[#E9E5F1] bg-white p-5 sm:p-6">
            <h2 className="text-base font-bold text-[#242039]">
              Tips for a clear scan
            </h2>

            <div className="mt-5 space-y-5">
              {[
                {
                  number: "01",
                  title: "Use good lighting",
                  description:
                    "Avoid shadows and reflections over printed details.",
                },
                {
                  number: "02",
                  title: "Keep text in focus",
                  description:
                    "Make sure the batch number and expiry date are readable.",
                },
                {
                  number: "03",
                  title: "Capture the right panel",
                  description:
                    "Photograph the side showing the batch number and expiry date.",
                },
                {
                  number: "04",
                  title: "Avoid cropping details",
                  description:
                    "Keep the printed text and its surrounding packaging visible.",
                },
              ].map((tip) => (
                <div key={tip.number} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-xs font-extrabold text-[#4926C8]">
                    {tip.number}
                  </span>

                  <div>
                    <h3 className="text-sm font-bold text-[#242039]">
                      {tip.title}
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {tip.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
            <ShieldCheck size={21} className="text-[#4926C8]" />

            <h3 className="mt-3 text-sm font-bold text-[#28145F]">
              Important information
            </h3>

            <p className="mt-2 text-xs leading-5 text-[#5B4A85]">
              A registry comparison only checks whether the extracted
              packaging details match a registry record. It does not establish
              the contents, quality, or safety of the medicine.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
