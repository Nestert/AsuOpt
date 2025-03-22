import React, { useState, useEffect, useRef } from 'react';
import { Box, CssBaseline, AppBar, Toolbar, Typography, Button, Grid, Paper, Divider, ButtonGroup, Menu, MenuItem, Alert, CircularProgress, Snackbar, Badge, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import axios from 'axios';
import './App.css';

import DeviceTree from './components/DeviceTree';
import DeviceDetails from './components/DeviceDetails';
import DeviceForm from './components/DeviceForm';

// Интерфейс устройства
interface Device {
  id: number;
  systemCode: string;
  equipmentCode: string;
  lineNumber: string;
  cabinetName: string;
  deviceDesignation: string;
  deviceType: string;
  description: string;
  parentId: number | null;
  children?: Device[];
}

function App() {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Состояние для импорта/экспорта и очистки БД
  const [importMenuAnchor, setImportMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean, message: string, importedCount?: number, timestamp?: Date } | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Состояние для диалога очистки БД
  const [clearDbDialogOpen, setClearDbDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearDbResult, setClearDbResult] = useState<{ success: boolean, message: string } | null>(null);

  // Загрузка всех устройств
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/devices');
        console.log('App: всего устройств загружено:', response.data.length);
        setDevices(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке устройств:', error);
      }
    };

    fetchDevices();
  }, [refreshKey]);

  // Обработчики событий
  const handleSelectDevice = (device: Device) => {
    setSelectedDevice(device);
  };

  const handleDeviceUpdated = () => {
    // Обновляем список устройств
    setRefreshKey(prevKey => prevKey + 1);
  };

  const handleDeviceDeleted = (deviceId: number) => {
    // Сбрасываем выделение устройства
    setSelectedDevice(null);
    // Обновляем список устройств
    setRefreshKey(prevKey => prevKey + 1);
  };

  const handleAddDevice = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Функция для экспорта в Excel
  const handleExportExcel = () => {
    window.open('http://localhost:3001/api/export/excel', '_blank');
  };

  // Обработчик открытия меню импорта
  const handleImportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setImportMenuAnchor(event.currentTarget);
  };

  // Обработчик закрытия меню импорта
  const handleImportMenuClose = () => {
    setImportMenuAnchor(null);
  };

  // Обработчик клика на кнопку выбора файла
  const handleSelectFileClick = () => {
    handleImportMenuClose();
    fileInputRef.current?.click();
  };

  // Обработчик выбора файла
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setUploadResult(null);
    }
  };

  // Обработчик импорта файла
  const handleImport = async () => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      setIsUploading(true);
      setUploadResult(null);
      
      const response = await axios.post(
        'http://localhost:3001/api/import/file', 
        formData, 
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      
      setUploadResult({
        success: true,
        message: `Импорт успешно завершен. Добавлено ${response.data.importedCount} устройств.`,
        importedCount: response.data.importedCount,
        timestamp: new Date()
      });
      
      // Показываем snackbar
      setSnackbarOpen(true);
      
      // Обновляем список устройств после успешного импорта
      handleDeviceUpdated();
    } catch (error) {
      console.error('Ошибка при импорте файла:', error);
      setUploadResult({
        success: false,
        message: 'Ошибка при импорте файла. Проверьте формат и структуру файла.',
        timestamp: new Date()
      });
      setSnackbarOpen(true);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Закрытие snackbar
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Функции для очистки базы данных
  const handleClearDbClick = () => {
    setClearDbDialogOpen(true);
  };
  
  const handleCloseClearDbDialog = () => {
    setClearDbDialogOpen(false);
  };
  
  const handleConfirmClearDb = async () => {
    try {
      setIsClearing(true);
      setClearDbResult(null);
      
      // Отправляем запрос на очистку базы данных
      const response = await axios.delete('http://localhost:3001/api/devices/clear');
      
      setClearDbResult({
        success: true,
        message: `База данных успешно очищена. Удалено ${response.data.deletedCount || 'все'} устройств.`
      });
      
      // Обновляем список устройств после очистки
      handleDeviceUpdated();
      
      // Сбрасываем выбранное устройство
      setSelectedDevice(null);
    } catch (error) {
      console.error('Ошибка при очистке базы данных:', error);
      setClearDbResult({
        success: false,
        message: 'Ошибка при очистке базы данных.'
      });
    } finally {
      setIsClearing(false);
      setClearDbDialogOpen(false); // Закрываем диалог после выполнения операции
      setSnackbarOpen(true); // Показываем уведомление
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <CssBaseline />
      
      {/* Верхняя панель */}
      <AppBar position="static" className="custom-appbar">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            АСУ ТП - Управление устройствами
          </Typography>
          
          {/* Кнопки импорта/экспорта/очистки */}
          <ButtonGroup variant="contained" color="primary" sx={{ mr: 2 }}>
            <Button
              startIcon={<FileDownloadIcon />}
              onClick={handleExportExcel}
              className="custom-button"
            >
              Экспорт
            </Button>
            <Button 
              startIcon={uploadResult && uploadResult.success ? 
                <Badge 
                  color="success" 
                  variant="dot" 
                  sx={{ '& .MuiBadge-badge': { right: 2, top: 2 } }}
                >
                  <FileUploadIcon />
                </Badge> : <FileUploadIcon />
              }
              onClick={handleImportMenuOpen}
              disabled={isUploading || isClearing}
              className="custom-button"
            >
              {isUploading ? <CircularProgress size={24} color="inherit" /> : 'Импорт'}
            </Button>
            <Button
              startIcon={<DeleteSweepIcon />}
              onClick={handleClearDbClick}
              disabled={isUploading || isClearing}
              color="error"
            >
              {isClearing ? <CircularProgress size={24} color="inherit" /> : 'Очистить БД'}
            </Button>
          </ButtonGroup>
          
          {/* Кнопка добавления устройства */}
          <Button 
            color="inherit" 
            startIcon={<AddIcon />}
            onClick={handleAddDevice}
            className="custom-button"
          >
            Добавить устройство
          </Button>
          
          {/* Меню импорта */}
          <Menu
            anchorEl={importMenuAnchor}
            open={Boolean(importMenuAnchor)}
            onClose={handleImportMenuClose}
          >
            <MenuItem onClick={handleSelectFileClick}>
              Выбрать файл...
            </MenuItem>
            {selectedFile && (
              <MenuItem onClick={handleImport} disabled={isUploading}>
                Импортировать {selectedFile.name}
              </MenuItem>
            )}
          </Menu>
          
          {/* Скрытый input для загрузки файла */}
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
          />
        </Toolbar>
        
        {/* Сообщение о результате импорта или очистки БД */}
        {(uploadResult || clearDbResult) && (
          <Alert 
            severity={(uploadResult?.success || clearDbResult?.success) ? 'success' : 'error'}
            onClose={() => { setUploadResult(null); setClearDbResult(null); }}
            icon={(uploadResult?.success || clearDbResult?.success) ? <CheckCircleIcon fontSize="inherit" /> : <ErrorIcon fontSize="inherit" />}
            sx={{ 
              borderRadius: 0, 
              fontSize: '0.95rem',
              '& .MuiAlert-icon': { fontSize: '1.2rem' }
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body1" fontWeight="500">
                {uploadResult 
                  ? (uploadResult.success ? 'Импорт успешно завершен' : 'Ошибка импорта')
                  : (clearDbResult?.success ? 'База данных очищена' : 'Ошибка очистки базы данных')
                }
              </Typography>
              <Typography variant="body2">
                {uploadResult?.message || clearDbResult?.message}
                {uploadResult?.timestamp && 
                  ` (${uploadResult.timestamp.toLocaleTimeString()})`
                }
              </Typography>
            </Box>
          </Alert>
        )}
      </AppBar>
      
      {/* Основное содержимое */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Левая панель - дерево устройств */}
        <Paper sx={{ width: 400, padding: 3, overflow: 'auto' }} className="custom-paper">
          <Typography variant="h6" gutterBottom>
            Устройства
          </Typography>
          <Divider sx={{ mb: 3 }} className="custom-divider" />
          <DeviceTree onSelectDevice={handleSelectDevice} />
        </Paper>
        
        {/* Правая панель - детали устройства */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', pl: 2 }} className="custom-paper">
          <DeviceDetails 
            device={selectedDevice} 
            onDeviceUpdated={handleDeviceUpdated}
            onDeviceDeleted={handleDeviceDeleted} 
          />
        </Box>
      </Box>
      
      {/* Диалог добавления устройства */}
      <DeviceForm
        open={dialogOpen}
        onClose={handleCloseDialog}
        onDeviceAdded={handleDeviceUpdated}
        parentDevices={devices}
      />
      
      {/* Диалог подтверждения очистки БД */}
      <Dialog
        open={clearDbDialogOpen}
        onClose={handleCloseClearDbDialog}
        aria-labelledby="clear-db-dialog-title"
        aria-describedby="clear-db-dialog-description"
      >
        <DialogTitle id="clear-db-dialog-title" color="error">
          Очистка базы данных
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="clear-db-dialog-description">
            Вы уверены, что хотите очистить базу данных? Это действие удалит ВСЕ устройства из системы и не может быть отменено.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseClearDbDialog} color="primary" autoFocus>
            Отмена
          </Button>
          <Button 
            onClick={handleConfirmClearDb} 
            color="error" 
            disabled={isClearing}
            startIcon={isClearing ? <CircularProgress size={18} /> : null}
          >
            {isClearing ? 'Очистка...' : 'Очистить'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar с уведомлением о результате импорта или очистки БД */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={(uploadResult?.success || clearDbResult?.success) ? 'success' : 'error'}
          sx={{ width: '100%' }}
          icon={(uploadResult?.success || clearDbResult?.success) ? <CheckCircleIcon fontSize="inherit" /> : <ErrorIcon fontSize="inherit" />}
        >
          {uploadResult 
            ? (uploadResult.success 
                ? `Файл '${selectedFile?.name}' успешно импортирован (${uploadResult.importedCount} устройств)` 
                : `Ошибка при импорте файла '${selectedFile?.name}'`) 
            : (clearDbResult?.success 
                ? 'База данных успешно очищена' 
                : 'Ошибка при очистке базы данных')
          }
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;
