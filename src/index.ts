import axios from 'axios';
import Koa from 'koa';
import KoaRouter from 'koa-router';

const xhr = axios.create({
    timeout: 5000,
    headers: {}
});

const app = new Koa();
const router = new KoaRouter()
    .get('/metrics', async (ctx, next) => {
        ctx.body = {};
    });

app.use(router.routes());
app.listen(3000);
