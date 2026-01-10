import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { LoginRequest } from '../interfaces/User';

const { Title, Text, Link } = Typography;

interface LoginProps {
  onSwitchToRegister?: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const handleSubmit = async (values: LoginRequest) => {
    setLoading(true);
    setError(null);

    try {
      await login(values);
      // После успешного входа, контекст перенаправит пользователя
    } catch (error: any) {
      console.error('Ошибка входа:', error);
      const errorMessage = error.response?.data?.message || 'Ошибка входа. Проверьте учетные данные.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f0f2f5'
    }}>
      <Card
        style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        bodyStyle={{ padding: '32px' }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <Title level={2} style={{ marginBottom: 8 }}>АСУ ТП</Title>
            <Text type="secondary">Вход в систему управления устройствами</Text>
          </div>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            size="large"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: 'Пожалуйста, введите имя пользователя' },
                { min: 3, message: 'Имя пользователя должно содержать минимум 3 символа' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Имя пользователя"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Пожалуйста, введите пароль' },
                { min: 6, message: 'Пароль должен содержать минимум 6 символов' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Пароль"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
              >
                Войти
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              Нет аккаунта?{' '}
              <Link onClick={onSwitchToRegister}>
                Зарегистрироваться
              </Link>
            </Text>
          </div>

          <div style={{ padding: '16px', background: '#f6f6f6', borderRadius: '4px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <strong>Тестовые учетные данные:</strong><br />
              Admin: admin / admin123<br />
              User: user / admin123
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default Login;