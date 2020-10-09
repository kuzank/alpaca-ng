import { Component, Inject, OnDestroy, OnInit, Optional } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StartupService } from '@core';
import { ReuseTabService } from '@delon/abc/reuse-tab';
import { DA_SERVICE_TOKEN, ITokenService, SocialOpenType, SocialService } from '@delon/auth';
import { SettingsService, _HttpClient } from '@delon/theme';
import { environment } from '@env/environment';
import { website } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'passport-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.less'],
  providers: [SocialService],
})
export class UserLoginComponent implements OnDestroy, OnInit {
  validCode = {
    // 验证码的索引
    key: '',
    // 预加载白色背景
    image: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  };

  form: FormGroup;
  error = '';
  type = 0;

  count = 0;
  interval$: any;

  constructor(
    fb: FormBuilder,
    private router: Router,
    private settingsService: SettingsService,
    private socialService: SocialService,
    @Optional()
    @Inject(ReuseTabService)
    private reuseTabService: ReuseTabService,
    @Inject(DA_SERVICE_TOKEN) private tokenService: ITokenService,
    private startupSrv: StartupService,
    public http: _HttpClient,
    public msg: NzMessageService,
    private settingService: SettingsService,
  ) {
    this.form = fb.group({
      tenantId: ['000000', []],
      userName: ['admin', [Validators.required]],
      password: ['admin', [Validators.required, Validators.minLength(5)]],
      code: [null, [Validators.required]],
      mobile: [null, [Validators.required, Validators.pattern(/^1\d{10}$/)]],
      captcha: [null, [Validators.required]],
      remember: [true],
    });
  }

  ngOnInit(): void {
    this.refreshCode();
  }

  switch({ index }: { index: number }): void {
    this.type = index;
  }

  getCaptcha(): void {
    if (this.mobile.invalid) {
      this.mobile.markAsDirty({ onlySelf: true });
      this.mobile.updateValueAndValidity({ onlySelf: true });
      return;
    }
    this.count = 59;
    this.interval$ = setInterval(() => {
      this.count -= 1;
      if (this.count <= 0) {
        clearInterval(this.interval$);
      }
    }, 1000);
  }

  submit(): void {
    this.error = '';
    if (this.type === 0) {
      this.loginByUsername();
    } else {
      this.loginByPhone();
    }
  }

  loginByUsername(): void {
    this.userName.markAsDirty();
    this.userName.updateValueAndValidity();
    this.password.markAsDirty();
    this.password.updateValueAndValidity();
    this.code.markAsDirty();
    this.code.updateValueAndValidity();

    if (this.userName.invalid || this.password.invalid || this.code.invalid) {
      return;
    }

    // 默认配置中对所有HTTP请求都会强制 [校验](https://ng-alain.com/auth/getting-started) 用户 Token
    // 然一般来说登录请求不需要校验，因此可以在请求URL加上：`/login?_allow_anonymous=true` 表示不触发用户 Token 校验
    this.http
      .post(
        'api/blade-auth/token?_allow_anonymous=true',
        {},
        {
          grantType: website.captchaMode ? 'captcha' : 'password',
          tenantId: this.tenantId.value,
          account: this.userName.value,
          password: this.password.value,
          type: 'account',
        },
        {
          headers: {
            'Captcha-Key': this.validCode.key,
            'Captcha-Code': this.code.value,
          },
        },
      )
      .subscribe((res) => {
        // 清空路由复用信息
        this.reuseTabService.clear();

        const data = res.data;
        data.token = res.data.accessToken;
        data.expired = +new Date() + res.data.expiresIn;
        data.name = res.data.userName;
        data.id = res.data.userId;

        console.log(data);

        // 设置用户Token信息
        this.tokenService.set(data);

        // 应用信息：包括站点名、描述、年份
        this.settingService.setApp({
          name: website.title,
          description: '',
        });

        // 用户信息：包括姓名、头像、邮箱地址
        this.settingService.setUser({
          name: res.data.userName,
          avatar: res.data.avatar,
          email: '',
        });

        // 重新获取 StartupService 内容，我们始终认为应用信息一般都会受当前用户授权范围而影响
        this.startupSrv.load().then(() => {
          let url = this.tokenService.referrer!.url || '/';
          if (url.includes('/passport')) {
            url = '/';
          }
          this.router.navigateByUrl(url);
        });
      });
  }

  loginByPhone(): void {
    this.mobile.markAsDirty();
    this.mobile.updateValueAndValidity();
    this.captcha.markAsDirty();
    this.captcha.updateValueAndValidity();
    if (this.mobile.invalid || this.captcha.invalid) {
      return;
    }

    // TODO
  }

  refreshCode(): void {
    this.http.get('api/blade-auth/captcha?_allow_anonymous=true').subscribe((res) => {
      this.validCode.key = res.data.key;
      this.validCode.image = res.data.image;
    });
  }

  open(type: string, openType: SocialOpenType = 'href'): void {
    let url = ``;
    let callback = ``;
    // tslint:disable-next-line: prefer-conditional-expression
    if (environment.production) {
      callback = 'https://ng-alain.github.io/ng-alain/#/callback/' + type;
    } else {
      callback = 'http://localhost:4200/#/callback/' + type;
    }
    switch (type) {
      case 'auth0':
        url = `//cipchk.auth0.com/login?client=8gcNydIDzGBYxzqV0Vm1CX_RXH-wsWo5&redirect_uri=${decodeURIComponent(callback)}`;
        break;
      case 'github':
        url = `//github.com/login/oauth/authorize?client_id=9d6baae4b04a23fcafa2&response_type=code&redirect_uri=${decodeURIComponent(
          callback,
        )}`;
        break;
      case 'weibo':
        url = `https://api.weibo.com/oauth2/authorize?client_id=1239507802&response_type=code&redirect_uri=${decodeURIComponent(callback)}`;
        break;
    }
    if (openType === 'window') {
      this.socialService
        .login(url, '/', {
          type: 'window',
        })
        .subscribe((res) => {
          if (res) {
            this.settingsService.setUser(res);
            this.router.navigateByUrl('/');
          }
        });
    } else {
      this.socialService.login(url, '/', {
        type: 'href',
      });
    }
  }

  get tenantId(): AbstractControl {
    return this.form.controls.tenantId;
  }

  get userName(): AbstractControl {
    return this.form.controls.userName;
  }

  get password(): AbstractControl {
    return this.form.controls.password;
  }

  get code(): AbstractControl {
    return this.form.controls.code;
  }

  get mobile(): AbstractControl {
    return this.form.controls.mobile;
  }

  get captcha(): AbstractControl {
    return this.form.controls.captcha;
  }

  ngOnDestroy(): void {
    if (this.interval$) {
      clearInterval(this.interval$);
    }
  }
}
