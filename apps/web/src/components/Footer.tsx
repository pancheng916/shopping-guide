export default function Footer() {
  return (
    <footer className="bg-white border-t border-border pt-10 pb-8 mt-10">
      <div className="max-w-6xl mx-auto px-4 md:px-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-md flex items-center justify-center text-white font-extrabold text-lg">
                $
              </div>
              <div className="text-xl font-bold text-text-primary tracking-tight">
                <span className="text-primary-500">今日</span>折扣
              </div>
            </div>
            <p className="text-sm text-text-tertiary mt-2 leading-relaxed max-w-sm">
              面向海外华人的电商导购平台，汇聚全球优质折扣信息，帮你买得聪明，省得开心。
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3 text-text-primary">热门分类</h4>
            <a href="#" className="block text-sm text-text-secondary mb-2 transition-colors hover:text-primary-500">
              美妆护肤
            </a>
            <a href="#" className="block text-sm text-text-secondary mb-2 transition-colors hover:text-primary-500">
              服饰手袋
            </a>
            <a href="#" className="block text-sm text-text-secondary mb-2 transition-colors hover:text-primary-500">
              电子电脑
            </a>
            <a href="#" className="block text-sm text-text-secondary mb-2 transition-colors hover:text-primary-500">
              母婴儿童
            </a>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3 text-text-primary">关于我们</h4>
            <a href="#" className="block text-sm text-text-secondary mb-2 transition-colors hover:text-primary-500">
              关于今日折扣
            </a>
            <a href="#" className="block text-sm text-text-secondary mb-2 transition-colors hover:text-primary-500">
              商家合作
            </a>
            <a href="#" className="block text-sm text-text-secondary mb-2 transition-colors hover:text-primary-500">
              隐私政策
            </a>
            <a href="#" className="block text-sm text-text-secondary mb-2 transition-colors hover:text-primary-500">
              用户协议
            </a>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-6 pt-4 border-t border-border-light flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-text-tertiary">
          <p>© 2024 今日折扣. All rights reserved.</p>
          <p>信息由用户或商家提供，本站核实后发布广告</p>
        </div>
      </div>
    </footer>
  );
}
