const userId = ''; 
let authToken = '';
const baseUrl = 'http://127.0.0.1:3000';

async function runTests() {
    console.log('--- Починаємо тестування ---');
    try {
        // 1. Реєстрація (POST /users)
        console.log('\n[1] Реєстрація нового користувача...');
        const registerResponse = await fetch(`${baseUrl}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Tester',
                email: `test${Date.now()}@example.com`,
                password: 'supersecret',
                age: 25
            })
        });
        const registerData = await registerResponse.json();
        
        console.log('--- HTTP STATUS:', registerResponse.status, '---');
        console.log('--- HTTP BODY:', registerData, '---');

        if (registerResponse.status !== 201) {
            throw new Error('Помилка реєстрації: ' + JSON.stringify(registerData));
        }
        
        authToken = registerData.token;
        const currentUserId = registerData.user._id;
        console.log('✅ Успішно! Отримано token:', authToken.substring(0, 15) + '...');
        console.log('Пароль зашифрований в базі (хеш):', registerData.user.password);
        
        // 2. Отримання профілю (GET /users/me)
        console.log('\n[2] Отримання профілю (GET /users/me)...');
        const profileResponse = await fetch(`${baseUrl}/users/me`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const profileData = await profileResponse.json();
        
        if (profileResponse.status !== 200) {
            throw new Error('Помилка отримання профілю');
        }
        console.log('✅ Профіль отримано для:', profileData.email);

        // 3. Оновлення паролю (PATCH /users/:id)
        console.log('\n[3] Оновлення паролю (PATCH /users/:id)...');
        const updateResponse = await fetch(`${baseUrl}/users/${currentUserId}`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ password: 'newsupersecret' })
        });
        const updateData = await updateResponse.json();
        
        if (updateResponse.status !== 200) {
            throw new Error('Помилка оновлення паролю');
        }
        console.log('✅ Пароль оновлено і зашифровано! Новий хеш:', updateData.password);
        
        // 4. Повторний Логін (опціонально: перевіримо вхід з новим паролем)
        console.log('\n[4] Вхід із новим паролем (POST /users/login)...');
        const loginResponse = await fetch(`${baseUrl}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: profileData.email,
                password: 'newsupersecret'
            })
        });
        const loginData = await loginResponse.json();
        if (loginResponse.status !== 200) {
            throw new Error('Помилка входу з новим паролем');
        }
        
        // Оновимо токен на новий для логауту
        authToken = loginData.token;
        console.log('✅ Вхід успішний з новим паролем. Отримано новий токен.');

        // 5. Вихід (POST /users/logout)
        console.log('\n[5] Вихід із системи (POST /users/logout)...');
        const logoutResponse = await fetch(`${baseUrl}/users/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (logoutResponse.status !== 200) {
            throw new Error('Помилка виходу');
        }
        console.log('✅ Успішний вихід із системи!');

        // 6. Перевірка доступу після виходу
        console.log('\n[6] Спроба отримати профіль після виходу (GET /users/me)...');
        const checkFailedResponse = await fetch(`${baseUrl}/users/me`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (checkFailedResponse.status === 401) {
            console.log('✅ Отримано помилку 401 Unauthorized ("Please authenticate."), як і очікувалось!');
        } else {
            console.error('❌ Неочікуваний статус:', checkFailedResponse.status);
        }

        console.log('\n--- Тестування успішно завершено! ---');
    } catch (e) {
        console.error('\n❌ Помилка під час тестування:', e.message);
    }
}

runTests();