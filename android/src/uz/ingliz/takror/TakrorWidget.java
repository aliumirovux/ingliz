package uz.ingliz.takror;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.SizeF;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.LocalDate;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Map;

/** «Takror» widgeti: bugungi takror soni, seriya va hafta kunlari (ma'lumot — Supabase «widget» funksiyasidan). */
public class TakrorWidget extends AppWidgetProvider {
    static final String API = "https://rqeirdempadfwirefyit.supabase.co/functions/v1/widget";
    static final String APP = "https://aliumirovux.github.io/ingliz/#takror"; // tugallanmagan takrorni davom ettiradi yoki boshlaydi
    // holat ranglari: to'q sariq — takror kutyapti, qizil — seriya xavfda (20:00 dan keyin), yashil — bugun tayyor
    static final int DUE = 0, RISK = 1, DONE = 2;
    static final int[] ACC = { 0xFFFF8A50, 0xFFFF5A4E, 0xFF3FD27A }, ACC2 = { 0xFFFFB27F, 0xFFFF9C86, 0xFF9BF0B9 };
    static final int[] BG = { R.drawable.bg_due, R.drawable.bg_risk, R.drawable.bg_done }, PILL = { R.drawable.pill_due, R.drawable.pill_risk, R.drawable.pill_done };

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("takror", Context.MODE_PRIVATE); }

    @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) { refresh(c, goAsync()); }

    @Override public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle o) { render(c, cached(c)); }

    /** internetdan yangilaydi (fon oqimida), keyin hamma widgetlarni qayta chizadi */
    static void refresh(final Context c, final PendingResult pr) {
        new Thread(() -> {
            try { render(c, fetch(c)); } catch (Exception e) { render(c, cached(c)); }
            finally { if (pr != null) pr.finish(); }
        }).start();
    }

    static JSONObject err(String e) { try { return new JSONObject().put("error", e); } catch (Exception x) { return new JSONObject(); } }

    static JSONObject cached(Context c) {
        String key = prefs(c).getString("key", "");
        if (key.isEmpty()) return err("nokey");
        String s = prefs(c).getString("last", null);
        if (s == null) return err("net");
        try { JSONObject d = new JSONObject(s); if (System.currentTimeMillis() - prefs(c).getLong("okAt", 0) > 45 * 60 * 1000L) d.put("stale", true); return d; } catch (Exception e) { return err("net"); }
    }

    static JSONObject fetch(Context c) throws Exception {
        String key = prefs(c).getString("key", "");
        if (key.isEmpty()) return err("nokey");
        HttpURLConnection h = (HttpURLConnection) new URL(API + "?k=" + key + "&d=" + LocalDate.now()).openConnection();
        h.setConnectTimeout(10000); h.setReadTimeout(10000);
        int code = h.getResponseCode();
        if (code == 404 || code == 400) return err("key");
        if (code != 200) return cached(c);
        InputStream in = h.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] b = new byte[4096]; int n; while ((n = in.read(b)) > 0) out.write(b, 0, n); in.close();
        String s = out.toString("UTF-8"); JSONObject d = new JSONObject(s);
        if (!d.has("due")) return cached(c);
        prefs(c).edit().putString("last", s).putLong("okAt", System.currentTimeMillis()).apply();
        return d;
    }

    static void render(Context c, JSONObject d) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, TakrorWidget.class));
        for (int id : ids) {
            RemoteViews v;
            if (Build.VERSION.SDK_INT >= 31) {
                Map<SizeF, RemoteViews> map = new HashMap<>();
                map.put(new SizeF(110f, 100f), build(c, d, R.layout.widget_small, true));
                map.put(new SizeF(250f, 100f), build(c, d, R.layout.widget, false));
                v = new RemoteViews(map);
            } else {
                int w = m.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
                v = w >= 230 ? build(c, d, R.layout.widget, false) : build(c, d, R.layout.widget_small, true);
            }
            m.updateAppWidget(id, v);
        }
    }

    /** 24 bo'lakli tishli yoy (270°): to'lgan bo'laklar — bugun qilingan ish, oxirgisi nur sochadi */
    static Bitmap gauge(Context c, float frac, int st, int dp) {
        float dens = c.getResources().getDisplayMetrics().density; int px = Math.round(dp * dens);
        Bitmap b = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888); Canvas cv = new Canvas(b);
        int n = 24, on = frac <= 0 ? 0 : Math.max(1, Math.round(n * Math.min(1f, frac)));
        float cx = px / 2f, cy = px * .52f, r1 = px * .385f, r2 = px * .465f, w = px * .042f;
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG); p.setStrokeCap(Paint.Cap.ROUND);
        Paint glow = new Paint(p); glow.setStrokeWidth(w * 1.8f); glow.setColor(ACC2[st]); glow.setAlpha(210); glow.setMaskFilter(new BlurMaskFilter(w * 1.1f, BlurMaskFilter.Blur.NORMAL));
        for (int i = 0; i < n; i++) {
            double a = Math.toRadians(-225 + i * 270.0 / (n - 1));
            float x1 = cx + r1 * (float) Math.cos(a), y1 = cy + r1 * (float) Math.sin(a), x2 = cx + r2 * (float) Math.cos(a), y2 = cy + r2 * (float) Math.sin(a);
            boolean lit = i < on, last = i == on - 1 && on < n;
            if (last) cv.drawLine(x1, y1, x2, y2, glow);
            p.setStrokeWidth(w); p.setColor(lit ? (last ? ACC2[st] : ACC[st]) : 0x24FFFFFF);
            cv.drawLine(x1, y1, x2, y2, p);
        }
        return b;
    }

    static RemoteViews build(Context c, JSONObject d, int layout, boolean small) {
        RemoteViews v = new RemoteViews(c.getPackageName(), layout);
        String error = d.optString("error", "");
        Intent tap = error.isEmpty() ? new Intent(Intent.ACTION_VIEW, Uri.parse(APP)) : new Intent(c, MainActivity.class);
        tap.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent pi = PendingIntent.getActivity(c, small ? 1 : 2, tap, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        v.setOnClickPendingIntent(R.id.root, pi);
        if (!small) v.setOnClickPendingIntent(R.id.btn, pi);

        int due = d.optInt("due"), streak = d.optInt("streak"), tom = d.optInt("tom"), min = d.optInt("min"), rev = d.optInt("rev");
        boolean late = Calendar.getInstance().get(Calendar.HOUR_OF_DAY) >= 20, stale = d.optBoolean("stale");
        int st = !error.isEmpty() ? DUE : due == 0 ? DONE : late && rev == 0 && streak > 0 ? RISK : DUE;
        v.setInt(R.id.root, "setBackgroundResource", BG[st]);
        v.setTextColor(R.id.title, ACC2[st]);
        v.setInt(R.id.fire, "setColorFilter", ACC[st]);

        if (!error.isEmpty()) {
            v.setTextViewText(R.id.title, "Ingliz tili");
            v.setViewVisibility(R.id.chip, View.GONE);
            v.setImageViewBitmap(R.id.gauge, gauge(c, 0, DUE, small ? 112 : 140));
            v.setTextViewText(R.id.num, "!");
            v.setTextViewText(R.id.numcap, error.equals("net") ? "internet yo'q" : "ulanmagan");
            if (!small) {
                v.setViewVisibility(R.id.stats, View.GONE);
                v.setTextViewText(R.id.btn, error.equals("net") ? "Keyinroq" : "Ulash");
                v.setInt(R.id.btn, "setBackgroundResource", PILL[DUE]);
            }
            return v;
        }

        float frac = due == 0 ? 1f : rev / (float) (rev + due);
        v.setImageViewBitmap(R.id.gauge, gauge(c, frac, st, small ? 112 : 140));
        if (streak > 0) { v.setViewVisibility(R.id.chip, View.VISIBLE); v.setTextViewText(R.id.streak, String.valueOf(streak)); }
        else v.setViewVisibility(R.id.chip, View.GONE);

        if (st == DONE) {
            v.setTextViewText(R.id.title, "Bugun tayyor");
            v.setTextViewText(R.id.num, String.valueOf(tom));
            v.setTextViewText(R.id.numcap, "ertaga");
        } else {
            v.setTextViewText(R.id.title, st == RISK ? "Seriya xavfda" : "Takror");
            v.setTextViewText(R.id.num, String.valueOf(due));
            v.setTextViewText(R.id.numcap, "so'z qoldi");
        }
        if (!small) {
            v.setViewVisibility(R.id.stats, View.VISIBLE);
            if (st == DONE) {
                stat(v, R.id.s1, R.id.s1u, R.id.s1c, String.valueOf(rev), "", "qilindi");
                stat(v, R.id.s2, R.id.s2u, R.id.s2c, String.valueOf(streak), "kun", "seriya");
                v.setViewVisibility(R.id.btn, View.GONE);
            } else {
                int left = Math.max(1, 24 - Calendar.getInstance().get(Calendar.HOUR_OF_DAY));
                if (st == RISK) stat(v, R.id.s1, R.id.s1u, R.id.s1c, String.valueOf(left), "soat", "qoldi");
                else stat(v, R.id.s1, R.id.s1u, R.id.s1c, String.valueOf(min), "daq", stale ? "oflayn" : "vaqt");
                stat(v, R.id.s2, R.id.s2u, R.id.s2c, String.valueOf(rev), "/" + (rev + due), "bugun");
                v.setViewVisibility(R.id.btn, View.VISIBLE);
                v.setInt(R.id.btn, "setBackgroundResource", PILL[st]);
                v.setTextViewText(R.id.btn, st == RISK ? "Saqlab qolish" : rev > 0 ? "Davom etish" : "Boshlash");
            }
        }
        return v;
    }

    static void stat(RemoteViews v, int n, int u, int cp, String num, String unit, String cap) {
        v.setTextViewText(n, num); v.setTextViewText(u, unit); v.setTextViewText(cp, cap);
    }
}
