const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

// Configura o Express para entender dados de formulários
app.use(express.urlencoded({ extended: true }));

// Cria um banco de dados SQLite em memória (apaga ao reiniciar o servidor)
const db = new sqlite3.Database(':memory:');

// Popula o banco com usuários e mensagens de teste
db.serialize(() => {
    db.run("CREATE TABLE users (id INT, username TEXT, password TEXT)");
    db.run("INSERT INTO users VALUES (1, 'admin', 'senhaSuperSecreta123')");
    
    db.run("CREATE TABLE messages (content TEXT)");
    db.run("INSERT INTO messages VALUES ('Bem-vindo ao nosso novo sistema!')");
});

// Rota Principal: Exibe o formulário de login e o mural de recados
app.get('/', (req, res) => {
    db.all("SELECT content FROM messages", [], (err, rows) => {
        const msgs = rows.map(r => `<li>${r.content}</li>`).join('');
        
        res.send(`
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h1>Sistema Interno</h1>
                
                <div style="background: #fee; padding: 10px; border: 1px solid red; max-width: 300px;">
                    <h3>Login de Administrador</h3>
                    <form action="/login" method="POST">
                        Usuário: <input type="text" name="username"><br><br>
                        Senha: <input type="password" name="password"><br><br>
                        <button type="submit">Entrar</button>
                    </form>
                </div>

                <hr>

                <h3>Mural de Recados (Público)</h3>
                <form action="/message" method="POST">
                    Deixe seu recado: <input type="text" name="msg" size="50">
                    <button type="submit">Enviar</button>
                </form>
                <ul>
                    ${msgs}
                </ul>
            </body>
            </html>
        `);
    });
});

// VULNERABILIDADE 1: SQL Injection
app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    // O erro: Concatenar strings diretamente na query SQL
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

    db.get(query, (err, row) => {
        if (row) {
            res.send(`<h1>Acesso Concedido!</h1><p>Bem-vindo, ${row.username}.</p><a href="/">Voltar</a>`);
        } else {
            res.send(`<h1>Acesso Negado!</h1><p>Usuário ou senha incorretos.</p><a href="/">Voltar</a>`);
        }
    });
});

// VULNERABILIDADE 2: Cross-Site Scripting (XSS)
app.post('/message', (req, res) => {
    const msg = req.body.msg;

    // O erro: Salvar e exibir o input do usuário sem nenhuma sanitização (limpeza)
    db.run(`INSERT INTO messages VALUES ('${msg}')`, () => {
        res.redirect('/');
    });
});

// Substitua as últimas linhas do app.js por:
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor vulnerável rodando na porta ${PORT}`);
});