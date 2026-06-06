#!/bin/bash

set -e

echo "="
echo "🧪 二手捐赠分拣台 - 端到端验证脚本"
echo "="

APP_URL="http://localhost:3000"

echo "📱 检查应用是否运行..."
if ! curl -s "$APP_URL" > /dev/null; then
    echo "⚠️  应用未运行，尝试启动..."
    cd "$(dirname "$0")/.."
    bash start.sh
    sleep 5
fi

echo ""
echo "✅ 应用运行正常: $APP_URL"
echo ""

echo "--- 测试场景 1: 重复扫码去重 ---"
echo ""
echo "📝 测试步骤:"
echo "  1. 输入条码 TEST-REPEAT-001"
echo "  2. 选择类别: 衣物"
echo "  3. 选择成色: 良好"
echo "  4. 点击添加物品"
echo "  5. 再次输入相同条码"
echo "  6. 验证: 应显示重复提示并定位原记录"
echo ""

echo "--- 测试场景 2: 污损物品不能分配给儿童机构 ---"
echo ""
echo "📝 测试步骤:"
echo "  1. 输入条码 TOY-DAMAGED-001"
echo "  2. 选择类别: 玩具"
echo "  3. 选择成色: 污损 ⚠️"
echo "  4. 点击'儿童机构'去向标签"
echo "  5. 验证: 按钮应禁用或显示错误提示"
echo "  6. 验证: 应显示'污损物品不能分配给儿童机构'提示"
echo ""

echo "--- 测试场景 3: 高价值物品必须复核 ---"
echo ""
echo "📝 测试步骤:"
echo "  1. 输入条码 HIGH-VALUE-001"
echo "  2. 选择类别: 电子产品"
echo "  3. 选择成色: 全新"
echo "  4. 勾选'高价值'标签"
echo "  5. 添加物品"
echo "  6. 进入'异常复核'标签页"
echo "  7. 验证: 物品应在待复核列表中"
echo "  8. 点击通过复核"
echo "  9. 验证: 物品状态变为'可交接'"
echo ""

echo "--- 测试场景 4: 已生成交接清单的物品不能修改成色 ---"
echo ""
echo "📝 测试步骤:"
echo "  1. 添加一个普通物品"
echo "  2. 进入'交接清单'标签页"
echo "  3. 点击'生成交接清单'"
echo "  4. 回到'分拣管理'标签页"
echo "  5. 点击编辑物品"
echo "  6. 验证: 成色选择按钮应禁用"
echo ""

echo "="
echo "📋 手动验证指引:"
echo "="
echo ""
echo "请在浏览器中打开: $APP_URL"
echo "按照上述测试场景逐一验证功能是否正常工作。"
echo ""
echo "运行单元测试: npm test"
echo "运行开发服务器: npm run dev"
echo "构建生产版本: npm run build"
echo ""
