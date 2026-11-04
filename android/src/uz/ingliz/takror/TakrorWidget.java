package uz.ingliz.takror;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.SizeF;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
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
    static final String APP = "https://aliumirovux.github.io/ingliz/#quiz";
    static final int[] DOTS = { R.id.d0, R.id.d1, R.id.d2, R.id.d3, R.id.d4, R.id.d5, R.id.d6 };

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
        try { JSONObject d = new JSONObject(s); d.put("stale", true); return d; } catch (Exception e) { return err("net"); }
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
        prefs(c).edit().putString("last", s).apply();
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

    static RemoteViews build(Context c, JSONObject d, int layout, boolean small) {
        RemoteViews v = new RemoteViews(c.getPackageName(), layout);
        String error = d.optString("error", "");
        Intent tap = error.isEmpty() ? new Intent(Intent.ACTION_VIEW, Uri.parse(APP)) : new Intent(c, MainActivity.class);
        tap.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        v.setOnClickPendingIntent(R.id.root, PendingIntent.getActivity(c, small ? 1 : 2, tap, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));

        if (!error.isEmpty()) {
            v.setTextViewText(R.id.head, "Ingliz tili");
            v.setViewVisibility(R.id.big, View.GONE);
            v.setViewVisibility(R.id.streakRow, View.GONE);
            if (!small) { v.setViewVisibility(R.id.week, View.GONE); v.setViewVisibility(R.id.btn, View.GONE); }
            v.setTextViewTextSize(R.id.title, TypedValue.COMPLEX_UNIT_SP, 14);
            v.setTextViewText(R.id.title, error.equals("net") ? "Internet yo'q" : error.equals("key") ? "Kalit eskirgan" : "Hisobni ulang");
            v.setTextViewText(R.id.sub, error.equals("net") ? "Keyinroq o'zi yangilanadi" : "Bosing va ilovadagi qadamlarni bajaring");
            return v;
        }

        int due = d.optInt("due"), streak = d.optInt("streak"), tom = d.optInt("tom"), min = d.optInt("min"), today = d.optInt("today", -1);
        boolean done = d.optBoolean("done"), late = Calendar.getInstance().get(Calendar.HOUR_OF_DAY) >= 20;
        String big = null, title, sub; boolean btn = true;
        if (due > 0 && !done && late && streak > 0) { title = "Bugun hali o'qilmadi"; sub = "Seriya " + streak + " kun · saqlab qoling"; }
        else if (due > 0) { big = String.valueOf(due); title = small ? "so'z tayyor" : "so'z takrorga tayyor"; sub = "~" + min + " daqiqa"; }
        else if (done) { title = "Bugungisi tayyor"; sub = tom > 0 ? "Ertaga " + tom + " ta" : "Ertaga takror yo'q"; btn = false; }
        else { title = "Takror yo'q"; sub = "Yangi so'z o'rganish vaqti"; }

        if (big != null) { v.setViewVisibility(R.id.big, View.VISIBLE); v.setTextViewText(R.id.big, big); v.setTextViewTextSize(R.id.title, TypedValue.COMPLEX_UNIT_SP, small ? 13 : 14); }
        else { v.setViewVisibility(R.id.big, View.GONE); v.setTextViewTextSize(R.id.title, TypedValue.COMPLEX_UNIT_SP, 20); }
        v.setTextViewText(R.id.title, title);
        v.setTextViewText(R.id.sub, d.optBoolean("stale") ? sub + " · oflayn" : sub);
        if (streak > 0) { v.setViewVisibility(R.id.streakRow, View.VISIBLE); v.setTextViewText(R.id.streak, small ? String.valueOf(streak) : streak + " kun"); }
        else v.setViewVisibility(R.id.streakRow, View.GONE);

        if (!small) {
            JSONArray wk = d.optJSONArray("week");
            for (int i = 0; i < 7; i++) {
                boolean on = wk != null && wk.optInt(i) == 1;
                v.setImageViewResource(DOTS[i], on ? R.drawable.ic_check : i == today ? R.drawable.dot_now : R.drawable.dot_off);
            }
            v.setViewVisibility(R.id.btn, btn ? View.VISIBLE : View.GONE);
        }
        return v;
    }
}
