"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, RefreshCw } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiBrowserMutation } from "@/lib/api/browser-client";
import { authClient } from "@/lib/auth/auth-client";
import { detectPublicIp } from "@/lib/network/public-ip";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  email: z.string().email({ message: "Masukkan alamat email yang valid." }),
  password: z.string().min(8, { message: "Password minimal harus 8 karakter." }),
  remember: z.boolean().optional(),
});

type LocationGateState = "idle" | "requesting" | "blocked" | "unsupported";

function requestCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20_000,
    });
  });
}

async function syncCurrentSessionNetwork() {
  const ipAddress = await detectPublicIp({ timeout: 5000 });
  await apiBrowserMutation("POST", "/me/session-network", { ipAddress });
}

type LoginFormProps = {
  officerOnly?: boolean;
};

export function LoginForm({ officerOnly = false }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [locationGate, setLocationGate] = useState<LocationGateState>("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const [loginPosition, setLoginPosition] = useState<GeolocationPosition | null>(null);
  const hasRequestedLocation = useRef(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const requestLoginLocation = async () => {
    if (!("geolocation" in navigator)) {
      setLocationMessage("Browser ini tidak mendukung GPS. Gunakan browser modern dan akses aplikasi melalui HTTPS.");
      setLocationGate("unsupported");
      return null;
    }

    setLocationMessage("Menunggu izin lokasi dari browser Anda...");
    setLocationGate("requesting");

    try {
      const position = await requestCurrentPosition();
      setLoginPosition(position);
      setLocationGate("idle");
      return position;
    } catch (error) {
      const geolocationError = error as GeolocationPositionError;
      const denied = geolocationError.code === geolocationError.PERMISSION_DENIED;
      setLocationMessage(
        denied
          ? "Izin lokasi ditolak. Ubah izin Location situs ini menjadi Allow, lalu muat ulang halaman."
          : "Lokasi belum dapat diperoleh. Pastikan GPS perangkat aktif dan sinyal lokasi tersedia, lalu coba lagi.",
      );
      setLocationGate("blocked");
      return null;
    }
  };

  useEffect(() => {
    if (!officerOnly || hasRequestedLocation.current) {
      return;
    }

    hasRequestedLocation.current = true;
    void requestLoginLocation();
  }, [officerOnly]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setFormError(null);

    if (officerOnly && !loginPosition) {
      setLocationMessage("Izinkan akses lokasi terlebih dahulu agar form login dapat digunakan.");
      setLocationGate("blocked");
      return;
    }

    startTransition(async () => {
      const callbackUrl = searchParams.get("callbackUrl")?.trim();
      const { data, error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        rememberMe: values.remember ?? true,
      });

      if (error) {
        if (error.status === 403) {
          setFormError("Email Anda belum diverifikasi. Silakan cek inbox dan verifikasi terlebih dahulu.");
          return;
        }

        setFormError(error.message || "Login gagal. Silakan periksa kembali kredensial Anda.");
        return;
      }

      const isFieldOfficer = data?.user.role === "field_officer";
      if (officerOnly && !isFieldOfficer) {
        await authClient.signOut();
        setFormError("Halaman ini khusus akun Field Officer. Gunakan halaman login utama untuk role lainnya.");
        return;
      }

      if (!officerOnly && isFieldOfficer) {
        await authClient.signOut();
        const officerLoginUrl = callbackUrl
          ? `/auth/officer?callbackUrl=${encodeURIComponent(callbackUrl)}`
          : "/auth/officer";
        router.replace(officerLoginUrl);
        return;
      }

      await syncCurrentSessionNetwork().catch(() => undefined);

      if (isFieldOfficer && loginPosition) {
        await fetch("/api/field-officer/live-location", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            latitude: loginPosition.coords.latitude,
            longitude: loginPosition.coords.longitude,
            gpsAccuracyMeters: loginPosition.coords.accuracy,
            capturedAt: new Date(loginPosition.timestamp).toISOString(),
          }),
        }).catch(() => undefined);
      }

      router.replace(callbackUrl || "/dashboard");
      router.refresh();
    });
  };

  const isLocating = locationGate === "requesting";
  const isLocationReady = !officerOnly || loginPosition !== null;
  const isBusy = isPending || isLocating;
  const isFormDisabled = isBusy || !isLocationReady;

  return (
    <form noValidate onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
      {(locationGate === "blocked" || locationGate === "unsupported") && (
        <Alert variant="destructive" className="rounded-xl border-red-500/20 bg-red-500/5 text-red-600">
          <AlertDescription className="text-xs">{locationMessage}</AlertDescription>
        </Alert>
      )}
      {formError ? (
        <Alert
          variant="destructive"
          className="rounded-xl border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400"
        >
          <AlertDescription className="text-xs">{formError}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup className="gap-4">
        {/* Email Address */}
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel
                htmlFor="login-email"
                className="text-xs font-mono font-bold text-muted-foreground/80 uppercase"
              >
                Email Address
              </FieldLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-4 size-4 text-muted-foreground/50" />
                <Input
                  {...field}
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                  disabled={isFormDisabled}
                  className="pl-9 rounded-[8px] border-border bg-background dark:bg-slate-900/35 focus-visible:ring-1 focus-visible:ring-cyan-500 dark:focus-visible:ring-[#14B8FF]/30 placeholder:text-muted-foreground/30 text-sm h-12"
                />
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Password */}
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel
                htmlFor="login-password"
                className="text-xs font-mono font-bold text-muted-foreground/80 uppercase"
              >
                Password
              </FieldLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-4 size-4 text-muted-foreground/50" />
                <Input
                  {...field}
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                  disabled={isFormDisabled}
                  className="pl-9 pr-9 rounded-[8px] border-border bg-background dark:bg-slate-900/35 focus-visible:ring-1 focus-visible:ring-cyan-500 dark:focus-visible:ring-[#14B8FF]/30 placeholder:text-muted-foreground/30 text-sm h-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-4 text-muted-foreground/60 hover:text-foreground cursor-pointer focus:outline-none"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Remember me & Forgot Password link row */}
        <div className="flex items-center justify-between mt-1">
          <Controller
            control={form.control}
            name="remember"
            render={({ field, fieldState }) => (
              <Field orientation="horizontal" data-invalid={fieldState.invalid} className="items-center gap-2">
                <Checkbox
                  id="login-remember"
                  name={field.name}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                  aria-invalid={fieldState.invalid}
                  disabled={isFormDisabled}
                  className="border-border rounded-[4px]"
                />
                <FieldContent>
                  <FieldLabel
                    htmlFor="login-remember"
                    className="font-sans text-xs text-muted-foreground cursor-pointer select-none"
                  >
                    Remember this device
                  </FieldLabel>
                </FieldContent>
              </Field>
            )}
          />

          <Link
            prefetch={false}
            href="/auth/forgot-password"
            className="text-xs text-cyan-600 dark:text-[#14B8FF] hover:underline font-mono"
          >
            Forgot Password?
          </Link>
        </div>
      </FieldGroup>

      {/* Primary Submit Button */}
      <Button
        className="w-full h-12 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white dark:from-[#14B8FF] dark:to-cyan-400 dark:text-slate-950 font-bold font-sans rounded-[8px] cursor-pointer shadow-[0_0_20px_rgba(20,184,255,0.25)] hover:brightness-110 hover:shadow-[0_0_25px_rgba(20,184,255,0.4)] active:scale-[0.98] mt-2 transition-all duration-200 flex items-center justify-center gap-2"
        type="submit"
        disabled={isFormDisabled}
      >
        {isLocating ? (
          <>
            <RefreshCw className="size-4 animate-spin" />
            <span>MENUNGGU IZIN LOKASI...</span>
          </>
        ) : isPending ? (
          <>
            <RefreshCw className="size-4 animate-spin" />
            <span>CONNECTING...</span>
          </>
        ) : (
          "ACCESS COMMAND CENTER"
        )}
      </Button>

      {/* SECURITY METADATA FOOTER BLOCK */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/40 text-xs font-mono text-muted-foreground/60 text-center select-none">
        <div>
          <span className="block text-[10px] opacity-75 uppercase">Environment</span>
          <span className="text-foreground font-semibold">Production</span>
        </div>
        <div>
          <span className="block text-[10px] opacity-75 uppercase">TLS Encryption</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Enabled</span>
        </div>
        <div>
          <span className="block text-[10px] opacity-75 uppercase">Version</span>
          <span className="text-foreground font-semibold">v2.4.0</span>
        </div>
      </div>
    </form>
  );
}
