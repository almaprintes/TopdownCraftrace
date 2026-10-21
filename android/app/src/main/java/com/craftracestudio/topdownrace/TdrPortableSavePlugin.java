package com.craftracestudio.topdownrace;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Android's system document picker is the durable export path for portable saves.
 * WebView blob: download anchors are not handled by Capacitor on many devices.
 * No filesystem permissions, WebView replacement, external URLs or sensitive logs.
 */
@CapacitorPlugin(name = "TdrPortableSave")
public class TdrPortableSavePlugin extends Plugin {
    private static final int MAX_SAVE_CHARS = 2_000_000;

    @PluginMethod
    public void saveJsonFile(PluginCall call) {
        final String json = call.getString("json");
        final String filename = call.getString("filename", "top-down-race-partida.json");
        if (json == null || json.isEmpty() || json.length() > MAX_SAVE_CHARS) {
            call.reject("La copia JSON no tiene un tamaño válido.");
            return;
        }
        if (filename == null || !filename.matches("[A-Za-z0-9._-]{1,100}\\.json")) {
            call.reject("El nombre del archivo JSON no es válido.");
            return;
        }
        try {
            JSONObject parsed = new JSONObject(json);
            if (!parsed.has("format") || !parsed.has("data")) {
                call.reject("No es una partida portátil válida.");
                return;
            }
        } catch (JSONException error) {
            call.reject("No se puede interpretar la copia JSON.");
            return;
        }

        final Intent picker = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        picker.addCategory(Intent.CATEGORY_OPENABLE);
        picker.setType("application/json");
        picker.putExtra(Intent.EXTRA_TITLE, filename);
        try {
            startActivityForResult(call, picker, "onDocumentChosen");
        } catch (Exception error) {
            call.reject("Android no ha podido abrir el selector de archivos.");
        }
    }

    @ActivityCallback
    private void onDocumentChosen(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK ||
                result.getData() == null || result.getData().getData() == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("saved", false);
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }

        final Uri uri = result.getData().getData();
        final String json = call.getString("json");
        if (json == null || json.length() > MAX_SAVE_CHARS) {
            call.reject("El contenido de la partida ya no está disponible.");
            return;
        }

        try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "w")) {
            if (output == null) throw new IOException("output_stream_unavailable");
            output.write(json.getBytes(StandardCharsets.UTF_8));
            output.flush();
            // Success is signalled only AFTER the stream has been closed.
        } catch (Exception error) {
            try { getContext().getContentResolver().delete(uri, null, null); }
            catch (Exception ignored) {}
            call.reject("No se ha podido escribir el JSON en la ubicación elegida.");
            return;
        }

        JSObject response = new JSObject();
        response.put("saved", true);
        response.put("cancelled", false);
        response.put("filename", call.getString("filename", "top-down-race-partida.json"));
        call.resolve(response);
    }
}
