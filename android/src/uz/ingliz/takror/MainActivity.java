package uz.ingliz.takror;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/** Kalitni ulash: saytdagi «Ilovaga ulash» tugmasi ingliztakror://k/<kalit> havolasini ochadi. Qo'lda qo'yish ham mumkin. */
public class MainActivity extends Activity {
    private TextView status;
    private LinearLayout box;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        take(getIntent());
        ui();
    }

    @Override protected void onNewIntent(Intent i) { super.onNewIntent(i); take(i); ui(); }

    private void take(Intent i) {
        Uri u = i == null ? null : i.getData();
        if (u == null || !"ingliztakror".equals(u.getScheme())) return;
        String k = u.getLastPathSegment();
        if (k != null && k.matches("[0-9a-f]{64}")) save(k);
    }

    private void save(String k) {
        TakrorWidget.prefs(this).edit().putString("key", k).remove("last").apply();
        TakrorWidget.refresh(getApplicationContext(), null);
    }

    private int px(float dp) { return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, getResources().getDisplayMetrics())); }
    private int col(int id) { return getColor(id); }

    private TextView text(String s, float sp, boolean bold, int color) {
        TextView t = new TextView(this); t.setText(s); t.setTextSize(sp); t.setTextColor(col(color));
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setLineSpacing(0, 1.2f); return t;
    }

    private Button button(String s, boolean primary) {
        Button bt = new Button(this); bt.setText(s); bt.setAllCaps(false); bt.setTextSize(16); bt.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable g = new GradientDrawable(); g.setCornerRadius(px(14));
        if (primary) { g.setColor(col(R.color.acc)); bt.setTextColor(col(R.color.on_acc)); }
        else { g.setColor(col(R.color.card)); g.setStroke(px(1), col(R.color.line)); bt.setTextColor(col(R.color.w_ink)); }
        bt.setBackground(g); bt.setMinHeight(px(52)); bt.setStateListAnimator(null);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = px(12); bt.setLayoutParams(lp); return bt;
    }

    private void ui() {
        boolean linked = !TakrorWidget.prefs(this).getString("key", "").isEmpty();
        ScrollView sv = new ScrollView(this); sv.setBackgroundColor(col(R.color.bg)); sv.setFitsSystemWindows(true);
        box = new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setPadding(px(20), px(28), px(20), px(28));
        sv.addView(box);

        box.addView(text("Ingliz takror", 26, true, R.color.w_ink));
        TextView lead = text("Uy ekranida bugungi takror soni va seriyangiz ko'rinadi. Widget bosilsa, Ingliz tili ilovasi ochiladi.", 15, false, R.color.w_mut);
        lead.setPadding(0, px(6), 0, px(18)); box.addView(lead);

        status = text(linked ? "✓ Hisob ulangan" : "Hisob hali ulanmagan", 16, true, linked ? R.color.ok : R.color.acc);
        box.addView(status);

        if (!linked) {
            TextView how = text("Ingliz tili saytida: Sozlamalar → Telefon widgeti → «Ilovaga ulash» tugmasini bosing. Kalit o'zi shu yerga keladi.", 15, false, R.color.w_ink);
            how.setPadding(0, px(8), 0, 0); box.addView(how);
            Button open = button("Saytni ochish", true);
            open.setOnClickListener(v -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://aliumirovux.github.io/ingliz/#sozlama"))));
            box.addView(open);

            TextView man = text("Yoki kalitni qo'lda qo'ying:", 14, false, R.color.w_mut); man.setPadding(0, px(24), 0, px(6)); box.addView(man);
            final EditText et = new EditText(this); et.setHint("64 belgili kalit"); et.setSingleLine(true);
            et.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS); et.setTextColor(col(R.color.w_ink)); et.setHintTextColor(col(R.color.w_mut));
            box.addView(et);
            Button sv2 = button("Saqlash", false);
            sv2.setOnClickListener(v -> {
                String k = et.getText().toString().trim().toLowerCase();
                if (k.matches("[0-9a-f]{64}")) { save(k); ui(); } else et.setError("Kalit 64 ta belgidan iborat (0-9, a-f)");
            });
            box.addView(sv2);
        } else {
            final AppWidgetManager m = AppWidgetManager.getInstance(this);
            if (m.isRequestPinAppWidgetSupported()) {
                Button add = button("Widgetni uy ekraniga qo'shish", true);
                add.setOnClickListener(v -> m.requestPinAppWidget(new ComponentName(this, TakrorWidget.class), null, null));
                box.addView(add);
            }
            TextView alt = text("Yoki: uy ekranini bosib turing → Vidjetlar → «Ingliz tili · Takror». Kattaligini o'zgartirsangiz, kichik ko'rinishga o'tadi.", 14, false, R.color.w_mut);
            alt.setPadding(0, px(14), 0, 0); box.addView(alt);
            Button upd = button("Hozir yangilash", false);
            upd.setOnClickListener(v -> { TakrorWidget.refresh(getApplicationContext(), null); status.setText("✓ Yangilandi"); });
            box.addView(upd);
            Button off = button("Hisobni uzish", false);
            off.setOnClickListener(v -> { TakrorWidget.prefs(this).edit().clear().apply(); TakrorWidget.refresh(getApplicationContext(), null); ui(); });
            box.addView(off);
        }
        box.setGravity(Gravity.START);
        setContentView(sv);
    }
}
