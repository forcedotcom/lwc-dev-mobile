//
//  ViewController.swift
//  LwcTestApp
//
//  Created by Meisam Seyed Aliroteh on 8/12/20.
//  Copyright © 2020 Meisam Seyed Aliroteh. All rights reserved.
//

import UIKit
import WebKit

fileprivate let NAMESPACE = "com.salesforce.mobile-tooling"
fileprivate let COMPONENT_NAME_ARG_PREFIX = "\(NAMESPACE).componentname"
fileprivate let PROJECT_DIR_ARG_PREFIX = "\(NAMESPACE).projectdir"
fileprivate let DEBUG_ARG = "ShowDebugInfoToggleButton"
fileprivate let USERNAME_ARG = "username"

class ViewController: UIViewController, WKNavigationDelegate {
    @IBOutlet weak var webView: WKWebView!
    @IBOutlet weak var activity: UIActivityIndicatorView!
    @IBOutlet weak var toggleDebugInfoButton: UIButton!
    @IBOutlet weak var debugTextView: UITextView!
    
    fileprivate var launchArguments: [String] = []
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        self.launchArguments = CommandLine.arguments
        self.launchArguments.remove(at: 0)
        
        let componentUrl = getComponentUrl(self.launchArguments)
        let isDebugEnabled = getIsDebugEnabled(self.launchArguments)
        let username = getUsername(self.launchArguments)
        let requestUrl = URL(string: "\(componentUrl)?username=\(username)")
        
        if (isDebugEnabled) {
            self.toggleDebugInfoButton.addTarget(self, action: #selector(ViewController.toggleDebugInfo(_:)), for: .touchUpInside)
            self.toggleDebugInfoButton.layer.borderColor = self.toggleDebugInfoButton.titleColor(for: .normal)?.cgColor
            self.toggleDebugInfoButton.layer.borderWidth = 1.0
            self.toggleDebugInfoButton.layer.cornerRadius = 4.0
            self.toggleDebugInfoButton.layer.masksToBounds = true
            
            self.debugTextView.textContainerInset = UIEdgeInsets(top: 5, left: 5, bottom: 5, right: 5)
            self.debugTextView.isHidden = true
            self.debugTextView.text =
                "RAW LAUNCH PARAMETERS:\n\n" +
                self.launchArguments.joined(separator: "\n\n") +
                "\n\n\n\nRESOLVED URL:" +
                "\n\n\(requestUrl?.absoluteString ?? "")"
        } else {
            self.toggleDebugInfoButton.isHidden = true;
            self.debugTextView.isHidden = true;
        }
        
        self.webView.navigationDelegate = self
        if (requestUrl != nil) {
            self.activity.startAnimating()
            self.webView.load(URLRequest(url: requestUrl!))
        }
    }
    
    @objc func toggleDebugInfo(_ sender:UIButton!) {
        self.debugTextView.isHidden = !self.debugTextView.isHidden
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        endNavigation(withError: nil);
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        endNavigation(withError: error);
    }
    
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        endNavigation(withError: error);
    }

    
    fileprivate func getComponentUrl(_ launchArguments: [String]) -> String {
        let match = launchArguments.first{$0.hasPrefix(COMPONENT_NAME_ARG_PREFIX)}
        guard var component = match else {return ""}
        component = component.replacingOccurrences(of: "\(COMPONENT_NAME_ARG_PREFIX)=", with: "")
        return "http://localhost:3333/lwc/preview/\(component)"
    }
    
    fileprivate func getUsername(_ launchArguments: [String]) -> String {
        let match = launchArguments.first{$0.hasPrefix(USERNAME_ARG)}
        guard var username = match else {return ""}
        username = username.replacingOccurrences(of: "\(USERNAME_ARG)=", with: "")
        return username
    }
    
    fileprivate func getIsDebugEnabled(_ launchArguments: [String]) -> Bool {
        let match = launchArguments.first{$0.hasPrefix(DEBUG_ARG)}
        guard var value = match else {return false}
        value = value.replacingOccurrences(of: "\(DEBUG_ARG)=", with: "")
        return Bool(value) ?? false;
    }
    
    fileprivate func endNavigation(withError error: Error?) {
        self.activity.stopAnimating()
        if let err = error {
            let alert = UIAlertController(title: "Error", message: err.localizedDescription, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Ok", style: UIAlertAction.Style.default, handler: nil))
            self.present(alert, animated: true, completion: nil)
        }
    }
}
