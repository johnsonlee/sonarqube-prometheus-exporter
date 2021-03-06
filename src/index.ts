import axios from 'axios';
import Koa from 'koa';
import KoaRouter from 'koa-router';

const METRICS = [
    'alert_status',
    'bugs',
    'new_bugs',
    'reliability_rating',
    'new_reliability_rating',
    'vulnerabilities',
    'new_vulnerabilities',
    'security_rating',
    'new_security_rating',
    'code_smells',
    'new_code_smells',
    'sqale_rating',
    'new_technical_debt',
    'coverage',
    'new_coverage',
    'new_lines_to_cover',
    'tests',
    'duplicated_lines_density',
    'new_duplicated_lines_density',
    'duplicated_blocks',
    'ncloc',
    'ncloc_language_distribution',
    'projects',
    'new_lines',
];
const API_BASE_URL = `${process.env.SONARQUBE_URL}/api`;
const API_MEASURES_URL = `${API_BASE_URL}/measures/components?additionalFields=metrics&metricKeys=${METRICS.join('%2C')}`;
const API_PROJECTS_URL = `${API_BASE_URL}/components/search_projects?ps=500&filter=isFavorite`;

const xhr = axios.create({
    timeout: 5000,
    headers: {
        'Authentication': `Basic ${process.env.SONARQUBE_TOKEN}`
    }
});

const printLables = (labels: any) => Object.entries(labels).map(i => i.join('=')).join(',');

const app = new Koa();
const router = new KoaRouter()
//    .get('/api/measures/components', async (ctx, next) => {
//        ctx.body = {
//            component: {
//                key: `${ctx.request.query['componentKey']}`,
//                name: `${ctx.request.query['componentKey']}`,
//                measures: [{
//                    metric: 'bugs',
//                    value: 100,
//                }],
//            },
//            metrics: [{
//                key: 'bugs',
//                name: 'Bugs',
//            }],
//        };
//    })
//    .get('/api/components/search_projects', async (ctx, next) => {
//        ctx.body = {
//            components: [{
//                key: 'debug',
//                name: 'debug',
//            }, {
//                key: 'release',
//                name: 'release',
//            }],
//        };
//    })
    .get('/metrics', async (ctx, next) => {
        const projects = ((await xhr.get(API_PROJECTS_URL)).data.components as []).map((it: any) => it.key);
        const results = (await Promise.all(projects.map(it => {
            return xhr.get(`${API_MEASURES_URL}&componentKey=${it}`);
        }))).map(it => it.data);
        const metrics: string[] = [];

        results.forEach(result => {
            const keys = result.metrics.reduce((acc: any, it: any) => {
                acc[it.key] = it.name;
                return acc;
            }, {});
            result.component.measures.forEach((measure: any) => {
                const prefix = `sonarqube_measure_component_${measure.metric}`;
                const labels: any = {
                    project: `"${result.component.name}"`,
                    desc: `"${measure.metric}"`,
                };

                switch (measure.metric) {
                    case 'alert_status':
                        metrics.push(`${prefix}{${printLables(labels)}} ${measure.value == 'ERROR' ? 1 : 0}`);
                        break;
                    case 'ncloc_language_distribution': {
                        measure.value.split(';').forEach((dist: string) => {
                            const [lang, nloc] = dist.split('=');
                            labels['lang'] = `"${lang}"`;
                            metrics.push(`${prefix}{${printLables(labels)}} ${nloc}`);
                        });
                        break;
                    }
                    default:
                        metrics.push(`${prefix}{${printLables(labels)}} ${measure.value || 0}`);
                        break;
                }
            });
        });

        ctx.body = metrics.sort().join('\n');
    });

app.use(router.routes());
app.listen(3000);

