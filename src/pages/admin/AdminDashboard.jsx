import { useAuth } from '../../contexts/AuthContext'

export default function AdminDashboard() {
  const { user, profile } = useAuth()

  const stats = [
    { label: 'ผู้พักอาศัยทั้งหมด', value: '156', color: 'bg-blue-500' },
    { label: 'ห้องว่าง', value: '12', color: 'bg-green-500' },
    { label: 'การชำระเงินค้างชำระ', value: '8', color: 'bg-red-500' },
    { label: 'ใบแจ้งซ่อมรอดำเนิน', value: '5', color: 'bg-yellow-500' },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ยินดีต้อนรับกลับมา, {user?.email}
        </h1>
        <p className="text-gray-600">
          {new Date().toLocaleDateString('th-TH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className={`w-12 h-12 ${stat.color} rounded-lg mb-4`} />
            <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">การกระทำที่รวดเร็ว</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
            <span className="text-2xl block mb-2">➕</span>
            <span className="font-medium text-gray-700">เพิ่มผู้พักอาศัย</span>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
            <span className="text-2xl block mb-2">📧</span>
            <span className="font-medium text-gray-700">ส่งแจ้งเตือน</span>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
            <span className="text-2xl block mb-2">📊</span>
            <span className="font-medium text-gray-700">ดูรายงาน</span>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
            <span className="text-2xl block mb-2">⚙️</span>
            <span className="font-medium text-gray-700">ตั้งค่าระบบ</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">กิจกรรมเมื่อเร็ว ๆ นี้</h2>
        <div className="space-y-3">
          {[
            { action: 'ผู้ใช้ใหม่ลงทะเบียน', time: '2 ชั่วโมงที่แล้ว', icon: '✓' },
            { action: 'การชำระเงินได้รับการยืนยัน', time: '5 ชั่วโมงที่แล้ว', icon: '✓' },
            { action: 'ใบแจ้งซ่อมใหม่สร้างขึ้น', time: '1 วันที่แล้ว', icon: '🔧' },
            { action: 'รายงานประจำเดือนถูกสร้างขึ้น', time: '2 วันที่แล้ว', icon: '📊' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between pb-3 border-b last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-gray-700">{item.action}</span>
              </div>
              <span className="text-sm text-gray-500">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
