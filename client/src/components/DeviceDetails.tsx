import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Snackbar,
  Alert,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import axios from 'axios';
import '../App.css';
import { Save as SaveIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

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
}

interface DeviceDetailsProps {
  device: Device | null;
  onDeviceUpdated?: (device: Device) => void;
  onDeviceDeleted?: (deviceId: number) => void;
}

// Компонент для отображения отдельного свойства устройства
const PropertyField = ({ 
  label, 
  value, 
  onChange, 
  name, 
  editMode, 
  multiline = false,
  isDescription = false 
}: { 
  label: string; 
  value: string; 
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  name: string; 
  editMode: boolean;
  multiline?: boolean;
  isDescription?: boolean;
}) => {
  return (
    <div className={`device-property ${isDescription ? 'description' : ''}`}>
      <Typography variant="subtitle2" className="device-property-label">
        {label}
      </Typography>
      {editMode ? (
        <TextField
          fullWidth
          variant="outlined"
          value={value || ''}
          onChange={onChange}
          name={name}
          size="small"
          className="custom-text-field"
          multiline={multiline}
          rows={multiline ? 4 : 1}
          margin="none"
          InputProps={{
            style: { 
              color: 'white',
              fontSize: '1rem',
              padding: '0'
            }
          }}
        />
      ) : (
        <div className="device-property-value">
          {value || '–'}
        </div>
      )}
    </div>
  );
};

const DeviceDetails: React.FC<DeviceDetailsProps> = ({ device, onDeviceUpdated, onDeviceDeleted }) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Device>({
    id: 0,
    systemCode: '',
    equipmentCode: '',
    lineNumber: '',
    cabinetName: '',
    deviceDesignation: '',
    deviceType: '',
    description: '',
    parentId: null
  });
  const [originalData, setOriginalData] = useState<Device | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [wasDeleted, setWasDeleted] = useState(false);
  const [deletedDeviceName, setDeletedDeviceName] = useState('');

  useEffect(() => {
    if (device) {
      // Убедимся что все поля определены
      const safeDevice: Device = {
        id: device.id,
        systemCode: device.systemCode || '',
        equipmentCode: device.equipmentCode || '',
        lineNumber: device.lineNumber || '',
        cabinetName: device.cabinetName || '',
        deviceDesignation: device.deviceDesignation || '',
        deviceType: device.deviceType || '',
        description: device.description || '',
        parentId: device.parentId
      };
      setFormData(safeDevice);
      setOriginalData(safeDevice);
    }
  }, [device]);

  // Проверка изменилось ли поле
  const isFieldChanged = (fieldName: keyof Device): boolean => {
    if (!originalData) return false;
    return formData[fieldName] !== originalData[fieldName];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleEditClick = () => {
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!device) return;

    try {
      const response = await axios.put(`http://localhost:3001/api/devices/${device.id}`, formData);
      setEditMode(false);
      setError(null);
      setSnackbarOpen(true);
      
      if (onDeviceUpdated) {
        onDeviceUpdated(response.data);
      }
    } catch (err) {
      console.error('Error updating device:', err);
      setError('Ошибка при обновлении устройства');
      setSnackbarOpen(true);
    }
  };

  const handleCancel = () => {
    if (device) {
      const safeDevice: Device = {
        id: device.id,
        systemCode: device.systemCode || '',
        equipmentCode: device.equipmentCode || '',
        lineNumber: device.lineNumber || '',
        cabinetName: device.cabinetName || '',
        deviceDesignation: device.deviceDesignation || '',
        deviceType: device.deviceType || '',
        description: device.description || '',
        parentId: device.parentId
      };
      setFormData(safeDevice);
    }
    setEditMode(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
    if (wasDeleted) {
      setWasDeleted(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!device) return;

    try {
      // Сохраняем информацию о устройстве перед удалением
      const deviceName = device.deviceDesignation;
      
      await axios.delete(`http://localhost:3001/api/devices/${device.id}`);
      setDeleteDialogOpen(false);
      setError(null);
      
      // Устанавливаем информацию об удалении
      setWasDeleted(true);
      setDeletedDeviceName(deviceName);
      setSnackbarOpen(true);
      
      // Сбрасываем форму
      setFormData({
        id: 0,
        systemCode: '',
        equipmentCode: '',
        lineNumber: '',
        cabinetName: '',
        deviceDesignation: '',
        deviceType: '',
        description: '',
        parentId: null
      });
      
      // Вызываем обработчик удаления устройства
      if (onDeviceDeleted) {
        onDeviceDeleted(device.id);
      }
    } catch (err) {
      console.error('Error deleting device:', err);
      setDeleteDialogOpen(false);
      setError('Ошибка при удалении устройства');
      setSnackbarOpen(true);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  // Модифицируем компонент PropertyField для использования в рендере
  const renderPropertyField = (
    label: string,
    name: keyof Device,
    multiline = false,
    isDescription = false
  ) => {
    const value = formData[name] as string;
    const isChanged = isFieldChanged(name);
    
    return (
      <div className={`device-property ${isDescription ? 'description' : ''}`}>
        <Typography variant="subtitle2" className="device-property-label">
          {label}
        </Typography>
        {editMode ? (
          <TextField
            fullWidth
            variant="outlined"
            value={value || ''}
            onChange={handleChange}
            name={name}
            size="small"
            className={`custom-text-field ${isChanged ? 'field-changed' : ''}`}
            multiline={multiline}
            rows={multiline ? 3 : 1}
            margin="none"
            placeholder={originalData ? (originalData[name] as string) : ''}
            InputProps={{
              style: { 
                color: isChanged ? '#d32f2f' : '#000000',
                fontSize: '0.95rem',
                height: isDescription ? '80px' : '40px'
              }
            }}
          />
        ) : (
          <div className="device-property-value">
            {value || '–'}
          </div>
        )}
      </div>
    );
  };

  if (!device || !formData) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1">Выберите устройство из списка для просмотра детальной информации</Typography>
      </Box>
    );
  }

  return (
    <div className="device-details">
      {device ? (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" component="h2">
              Свойства устройства
            </Typography>
            <div>
              {editMode ? (
                <>
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    sx={{ mr: 2 }}
                  >
                    Отмена
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleSave}
                    startIcon={<SaveIcon />}
                  >
                    Сохранить
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDeleteClick}
                    startIcon={<DeleteIcon />}
                    sx={{ mr: 2 }}
                  >
                    Удалить
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleEditClick}
                    startIcon={<EditIcon />}
                  >
                    Редактировать
                  </Button>
                </>
              )}
            </div>
          </Box>


          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              {renderPropertyField("Код системы", "systemCode")}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderPropertyField("Код оборудования", "equipmentCode")}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderPropertyField("Номер линии", "lineNumber")}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderPropertyField("Название шкафа", "cabinetName")}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderPropertyField("Обозначение", "deviceDesignation")}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderPropertyField("Тип устройства", "deviceType")}
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mt: 1 }}>
                <div className={`device-property description`}>
                  <Typography variant="subtitle2" className="device-property-label" sx={{ mb: 1 }}>
                    Описание
                  </Typography>
                  {editMode ? (
                    <TextField
                      fullWidth
                      variant="outlined"
                      value={formData.description || ''}
                      onChange={handleChange}
                      name="description"
                      size="small"
                      className={`custom-text-field ${isFieldChanged('description') ? 'field-changed' : ''}`}
                      multiline
                      rows={3}
                      margin="none"
                      placeholder={originalData ? (originalData.description as string) : ''}
                      InputProps={{
                        style: { 
                          color: isFieldChanged('description') ? '#d32f2f' : '#000000',
                          fontSize: '0.95rem',
                          minHeight: '80px'
                        }
                      }}
                      sx={{ mt: 1 }}
                    />
                  ) : (
                    <div className="device-property-value">
                      {formData.description || '–'}
                    </div>
                  )}
                </div>
              </Box>
            </Grid>
          </Grid>
          
          <Snackbar 
            open={snackbarOpen} 
            autoHideDuration={6000} 
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Alert onClose={handleCloseSnackbar} severity={error ? 'error' : 'success'}>
              {error || (wasDeleted 
                ? `Устройство "${deletedDeviceName}" успешно удалено` 
                : 'Устройство успешно обновлено')}
            </Alert>
          </Snackbar>

          {/* Диалог подтверждения удаления */}
          <Dialog
            open={deleteDialogOpen}
            onClose={handleDeleteCancel}
            PaperProps={{ className: 'custom-paper' }}
          >
            <DialogTitle>Подтверждение удаления</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Вы действительно хотите удалить устройство "{device.deviceDesignation}"? Это действие нельзя отменить.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleDeleteCancel} color="primary">
                Отмена
              </Button>
              <Button onClick={handleDeleteConfirm} color="error" autoFocus>
                Удалить
              </Button>
            </DialogActions>
          </Dialog>
        </>
      ) : (
        <Typography variant="body1">Выберите устройство для просмотра деталей</Typography>
      )}
    </div>
  );
};

export default DeviceDetails; 