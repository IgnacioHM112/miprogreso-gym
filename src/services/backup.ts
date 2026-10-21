import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { exportDatabaseToJson, importDatabaseFromJson } from '@/db/repo';

/**
 * Exporta toda la base de datos a un archivo JSON y abre el diálogo nativo para compartirlo
 * (guardar en archivos, Google Drive, WhatsApp, etc.).
 */
export async function exportBackup(): Promise<{ success: boolean; message: string; filePath?: string }> {
  try {
    const jsonStr = exportDatabaseToJson();
    const now = new Date();
    const dateTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const fileName = `miprogreso_gym_backup_${dateTag}.json`;
    const targetDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

    if (!targetDir) {
      return { success: false, message: 'No se pudo acceder al almacenamiento del dispositivo.' };
    }

    const filePath = `${targetDir}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, jsonStr, { encoding: FileSystem.EncodingType.UTF8 });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Exportar copia de seguridad de MiProgreso Gym',
        UTI: 'public.json',
      });
    }

    return {
      success: true,
      message: 'Copia de seguridad generada con éxito.',
      filePath,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error al exportar: ${error?.message || 'Error desconocido'}`,
    };
  }
}

/**
 * Abre el selector de documentos para elegir un archivo .json de respaldo y restaura los datos.
 */
export async function importBackup(): Promise<{ success: boolean; message: string; counts?: any }> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/*', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, message: 'No se seleccionó ningún archivo.' };
    }

    const fileUri = result.assets[0].uri;
    const fileContent = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const importResult = importDatabaseFromJson(fileContent);
    return importResult;
  } catch (error: any) {
    return {
      success: false,
      message: `Error al importar: ${error?.message || 'Error desconocido'}`,
    };
  }
}
