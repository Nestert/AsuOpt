import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Snackbar,
  Alert,
  Typography,
  FormHelperText
} from '@mui/material';
import axios from 'axios';
import '../App.css';

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

interface DeviceFormProps {
  open: boolean;
  onClose: () => void;
  onDeviceAdded: () => void;
  parentDevices: Device[];
  isEditing?: boolean;
  id?: string;
}

const initialFormState = {
  systemCode: '',
  equipmentCode: '',
  lineNumber: '',
  cabinetName: '',
  deviceDesignation: '',
  deviceType: '',
  description: '',
  parentId: null as number | null
};

const DeviceForm: React.FC<DeviceFormProps> = ({ open, onClose, onDeviceAdded, parentDevices, isEditing, id }) => {
  const [formData, setFormData] = useState(initialFormState);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });
  const [errors, setErrors] = useState({
    systemCode: '',
    equipmentCode: '',
    lineNumber: '',
    cabinetName: '',
    deviceDesignation: '',
    deviceType: '',
    description: '',
    parentId: ''
  });

  const handleChange = (name: string, value: any) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value === '' ? null : Number(value)
    });
  };

  const handleSubmit = async () => {
    try {
      await axios.post('http://localhost:3001/api/devices', formData);
      setSnackbar({
        open: true,
        message: 'Устройство успешно добавлено',
        severity: 'success'
      });
      setFormData(initialFormState);
      onDeviceAdded();
      onClose();
    } catch (error) {
      console.error('Ошибка при создании устройства:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при создании устройства',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ className: "custom-paper" }}
      >
        <DialogTitle>
          {isEditing ? 'Редактирование устройства' : 'Добавление нового устройства'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Код системы"
                value={formData.systemCode}
                onChange={(e) => handleChange('systemCode', e.target.value)}
                error={!!errors.systemCode}
                helperText={errors.systemCode}
                variant="outlined"
                className="custom-text-field"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Код оборудования"
                value={formData.equipmentCode}
                onChange={(e) => handleChange('equipmentCode', e.target.value)}
                error={!!errors.equipmentCode}
                helperText={errors.equipmentCode}
                variant="outlined"
                className="custom-text-field"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Номер линии"
                value={formData.lineNumber}
                onChange={(e) => handleChange('lineNumber', e.target.value)}
                variant="outlined"
                className="custom-text-field"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Название шкафа"
                value={formData.cabinetName}
                onChange={(e) => handleChange('cabinetName', e.target.value)}
                variant="outlined"
                className="custom-text-field"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Обозначение устройства"
                value={formData.deviceDesignation}
                onChange={(e) => handleChange('deviceDesignation', e.target.value)}
                error={!!errors.deviceDesignation}
                helperText={errors.deviceDesignation}
                variant="outlined"
                className="custom-text-field"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Тип устройства"
                value={formData.deviceType}
                onChange={(e) => handleChange('deviceType', e.target.value)}
                error={!!errors.deviceType}
                helperText={errors.deviceType}
                variant="outlined"
                className="custom-text-field"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Описание"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                multiline
                rows={3}
                variant="outlined"
                className="custom-text-field"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined" className="custom-text-field">
                <InputLabel>Родительское устройство</InputLabel>
                <Select
                  value={formData.parentId === null ? '' : formData.parentId}
                  onChange={(e) => handleChange('parentId', e.target.value === '' ? null : Number(e.target.value))}
                  label="Родительское устройство"
                >
                  <MenuItem value="">Нет (корневое устройство)</MenuItem>
                  {parentDevices
                    .filter(d => d.id !== (isEditing ? parseInt(id as string) : 0))
                    .map(device => (
                      <MenuItem key={device.id} value={device.id}>
                        {device.deviceDesignation} ({device.systemCode})
                      </MenuItem>
                    ))}
                </Select>
                <FormHelperText>Выберите родительское устройство или оставьте пустым для корневого устройства</FormHelperText>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Отмена
          </Button>
          <Button onClick={handleSubmit} color="primary" className="custom-button">
            {isEditing ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DeviceForm; 