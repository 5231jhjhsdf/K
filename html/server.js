const express = require('express');
const neo4j = require('neo4j-driver');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3005;

app.use(cors({ origin: '*' }));

const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', '123456789'));

// 定义一个颜色映射，可以根据需要扩展
const colorMap = {
  Treatment: '#1f78b4',
  Disease: '#33a02c',
  RiskFactor: '#ff7f00',
  Criterion: '#6a3d9a',
  Complication: '#e41a1c',
  Symptom: '#377eb8',
  // 添加第六个图谱的颜色映射
  SleepMedicine: '#FFD700'
};

// 定义查询
const queries = {
  data1: `
    MATCH (entity1:Treatment)-[r:RECOMMENDED_FOR]->(entity2:Disease)
    RETURN entity1, r, entity2, labels(entity1) AS entity1Labels, labels(entity2) AS entity2Labels LIMIT 50;
  `,
  data2: `
    MATCH (entity1:RiskFactor)-[r:ASSESSES_RISK_OF]->(entity2:Disease)
    RETURN entity1, r, entity2, labels(entity1) AS entity1Labels, labels(entity2) AS entity2Labels LIMIT 50;
  `,
  data3: `
    MATCH (entity1:Criterion)-[r:DIAGNOSED_AS]->(entity2:Disease)
    RETURN entity1, r, entity2, labels(entity1) AS entity1Labels, labels(entity2) AS entity2Labels LIMIT 50;
  `,
  data4: `
    MATCH (entity1:Complication)-[r:CO_OCCURS_WITH]->(entity2:Disease)
    RETURN entity1, r, entity2, labels(entity1) AS entity1Labels, labels(entity2) AS entity2Labels LIMIT 50;
  `,
  data5: `
    MATCH (entity1:Symptom)-[r:ASSOCIATED_WITH]->(entity2:Disease)
    RETURN entity1, r, entity2, labels(entity1) AS entity1Labels, labels(entity2) AS entity2Labels LIMIT 50;
  `,
  index: `
   MATCH (center:Node {name: '睡眠医疗诊断'})-[:CONNECTS]->(relation:Relation)-[:RELATES]->(entity:Entity)
RETURN center AS entity1, relation AS r, entity AS entity2, labels(center) AS entity1Labels,labels(entity) AS entity2Labels
  `
};

// 创建通用的路由处理函数
const createRoute = (route, query) => {
  app.get(`/${route}`, async (req, res) => {
    const session = driver.session();
    try {
      const result = await session.run(query);
      const nodes = new Map();
      const edges = [];

      result.records.forEach(record => {
        const entity1 = record.get('entity1');
        const relationship = record.get('r');
        const entity2 = record.get('entity2');

        if (!entity1 || !relationship || !entity2) {
          console.warn('Missing data in record:', record);
          return;
        }

        const entity1Labels = record.get('entity1Labels');
        const entity2Labels = record.get('entity2Labels');

        // 提取节点属性并设置颜色
        const node1 = {
          id: entity1.identity.toString(),
          label: entity1.properties.name || entity1.identity.toString(),
          type: entity1Labels[0],
          color: colorMap[entity1Labels[0]] || '#ccc' // 使用映射中的颜色
        };

        const node2 = {
          id: entity2.identity.toString(),
          label: entity2.properties.name || entity2.identity.toString(),
          type: entity2Labels[0],
          color: colorMap[entity2Labels[0]] || '#ccc' // 使用映射中的颜色
        };

        nodes.set(node1.id, node1);
        nodes.set(node2.id, node2);

        // 创建边
        edges.push({
          id: `${node1.id}-${node2.id}`, // 确保边的ID唯一
          from: node1.id,
          to: node2.id,
          label: relationship.type
        });
      });

      res.json({ nodes: Array.from(nodes.values()), edges });
    } catch (error) {
      console.error(`Error running ${route}:`, error);
      res.status(500).send('Internal Server Error');
    } finally {
      await session.close();
    }
  });
};

// 创建六个知识图谱的路由
for (const [route, query] of Object.entries(queries)) {
  createRoute(route, query);
}

const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// 优雅关闭
process.on('SIGINT', async () => {
  await driver.close();
  process.exit(0);
});