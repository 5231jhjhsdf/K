
const express = require('express');
const neo4j = require('neo4j-driver');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

// 允许跨域请求
app.use(cors());

// 创建 Neo4j 驱动
const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', '123456789')); // 替换为您的用户名和密码

app.get('/api/data', async (req, res) => {
  const session = driver.session();
  try {
    // 获取所有节点
    const nodeResult = await session.run('MATCH (n) RETURN id(n) AS id, n.name AS name');
    const nodes = nodeResult.records.map(record => ({
      id: record.get('id').toString(),
      name: record.get('name') || record.get('id').toString()
    }));

    // 获取所有边
    const edgeResult = await session.run('MATCH (a)-[r]->(b) RETURN id(a) AS startId, id(b) AS endId, type(r) AS type');
    const edges = edgeResult.records.map(record => ({
      startId: record.get('startId').toString(),
      endId: record.get('endId').toString(),
      type: record.get('type')
    }));

    res.json({ nodes, edges });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await session.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
